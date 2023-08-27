var express = require("express");
var router = express.Router({ mergeParams: true });
var Campground = require("../models/campground");
var Comment = require("../models/comment");
var middleware = require("../middleware");

//new route
router.get("/new", middleware.isLoggedIn, function (req, res) {
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
      req.flash("error", "Failed to load campground!");
      res.redirect("back");
    } else {
      res.render("comments/new", { campground: campground });
    }
  });
});

//create route
router.post("/", middleware.isLoggedIn, function (req, res) {
  //look up campground using ID
  //create new comment
  //connect new comment to campground
  //redirect to somewhere
  Campground.findById(req.params.id, function (err, campground) {
    if (err) {
      req.flash("error", "Failed to load campground!");
      res.redirect("back");
    } else {
      Comment.create(req.body.comment, function (err, comment) {
        if (err) {
          req.flash("error", "Failed to create comment!");
        } else {
          //add username and id to comment
          //save comment
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          comment.save();
          campground.comments.push(comment);
          campground.save(); //save!!!
          res.redirect("/campgrounds/" + campground._id);
        }
      });
    }
  });
});

//edit comment route
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function (req, res) {
  Comment.findById(req.params.comment_id, function (err, foundComment) {
    if (err) {
      req.flash("error", "Failed to edit comment!");
      res.redirect("back");
    } else {
      res.render("comments/edit", { campground_id: req.params.id, comment: foundComment });
    }
  });
});

//update comment route
router.put("/:comment_id", middleware.checkCommentOwnership, function (req, res) {
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedComment) {
    if (err) {
      req.flash("error", "Failed to update comment!");
      res.redirect("back");
    } else {
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});

//destroy comment route
router.delete("/:comment_id", middleware.checkCommentOwnership, function (req, res) {
  Comment.findByIdAndRemove(req.params.comment_id, function (err) {
    if (err) {
      res.redirect("back");
    } else {
      req.flash("success", "Comment deleted successfully!");
      res.redirect("/campgrounds/" + req.params.id);
    }
  });
});


module.exports = router;
