var express = require("express");
var router = express.Router({ mergeParams: true });
var request = require('request');
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var User = require("../models/user");
var middleware = require("../middleware/index");
var Review = require("../models/review");
var multer = require('multer');
var cloudinary = require('cloudinary');
var Notification = require("../models/notification");



//multer and cloudinary configuration
var storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter });

cloudinary.config({
    cloud_name: 'duxhbhrpc',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// ==================
// campgrounds routes
// ==================

//show all the campgrounds
router.get("/", function (req, res) {
    var perPage = 12;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({ name: regex }).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({ name: regex }).exec(function (err, count) {
                if (err) {
                    req.flash("error", err.message);
                    res.redirect("back");
                } else {
                    if (allCampgrounds.length < 1) {
                        noMatch = "No Campgrounds Match, Please Try Again!";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        noMatch: noMatch,
                        pages: Math.ceil(count / perPage),
                        search: req.query.search,
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    req.flash("error", err.message);
                    res.redirect("back");
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        search: false,
                        noMatch: noMatch,
                    });
                }
            });
        });
    }
});

//show add forms 
router.get("/new", middleware.isLoggedIn, function (req, res) {
    res.render("campgrounds/new");
});

//add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function (req, res) {
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var price = req.body.price;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }

    //upload image to cloudinary and set image url
    cloudinary.uploader.upload(req.file.path, async function (result) {
        // add cloudinary url for the image to the campground object under image property
        var image = result.secure_url;
        var imageId = result.public_id;

        // add property to campground
        var newCampground = { name: name, image: image, imageId: imageId, price: price, description: desc, author: author };

        try {
            let campground = await Campground.create(newCampground);
            let user = await User.findById(req.user._id).populate('followers').exec();
            let newNotification = {
                username: req.user.username,
                campgroundId: campground.id
            }
            for (const follower of user.followers) {
                let notification = await Notification.create(newNotification);
                follower.notifications.push(notification);
                follower.save();
            }

            //redirect back to campgrounds page
            res.redirect(`/campgrounds/${campground.id}`);
        } catch (err) {
            console.log(err);
            req.flash('error', err.message);
            res.redirect(`/campgrounds/${campground.id}`);
        }

    });
});



// show details of one campground
router.get("/:id", function (req, res) {
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }
    }).exec(function (err, foundCampground) {
        if (err) {
            req.flash("error", err);
            res.redirect("back");
        } else {
            res.render('campgrounds/show', { campground: foundCampground });
        }
    });
});



//edit capmground route
router.get("/:id/edit", middleware.checkCampgroundOwnership, function (req, res) {
    Campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            req.flash("error", "Failed to edit campground!!");
            res.redirect("back");
        } else {
            res.render("campgrounds/edit", { campground: foundCampground });
        }
    });
});

//update campground route
router.put("/:id", middleware.checkCampgroundOwnership, upload.single('image'), function (req, res) {
    Campground.findById(req.params.id, async function (err, campground) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
                try {
                    await cloudinary.uploader.destroy(campground.imageId);
                    var result = await cloudinary.uploader.upload(req.file.path);
                    campground.imageId = result.public_id;
                    campground.image = result.secure_url;
                } catch (err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }

            campground.name = req.body.name;
            campground.price = req.body.price;
            campground.description = req.body.description;
            campground.save();
            req.flash("success", "Successfully Updated!");
            res.redirect("/campgrounds/" +campground._id);

        }
    });
});


//delete the campground
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("/campgrounds");
        } else {
            // deletes all comments associated with the campground
            Comment.remove({ "_id": { $in: campground.comments } }, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({ "_id": { $in: campground.reviews } }, async function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    } else {
                        //  delete the image and campground
                        try {
                            await cloudinary.uploader.destroy(campground.imageId);
                            campground.remove();
                            req.flash('success', 'Campground deleted successfully!');
                            res.redirect('/campgrounds');
                        } catch (err) {
                            if (err) {
                                console.log(err);
                                req.flash("error", err.message);
                                return res.redirect("back");
                            }
                        }
                        req.flash("success", "Campground deleted successfully!");
                        res.redirect("/campgrounds");
                    }
                });
            });
        }
    });
});



module.exports = router;