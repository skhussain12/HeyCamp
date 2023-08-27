var Campground = require("../models/campground"),
       Comment = require("../models/comment"),
        Review = require("../models/review");

//all the middleware
var middlewareObj = {};

//check the ownership of campground
middlewareObj.checkCampgroundOwnership = function(req, res, next){
  //is user logged in?
  if(req.isAuthenticated()){
    Campground.findById(req.params.id, function(err, foundCampground){
      if(err){
        req.flash("error", "Campground not found!");
        res.redirect("back");
      } else {
        //does the user own the campground?
        if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
          next();
        } else {
          req.flash("error", "You do not have permission to do that!");
          res.redirect("back");
        } 
      }
    });
  } else {
    req.flash("error", "You need to login to do that!");
    res.redirect("back");
  }
}

//check the ownership of comment
middlewareObj.checkCommentOwnership = function(req, res, next){
  //is user logged in?
  if(req.isAuthenticated()){
    Comment.findById(req.params.comment_id, function(err, foundComment){
      if(err){
        req.flash("error", "Comment not found!");
        res.redirect("back");
      } else {
        if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
          next();
        } else {
          req.flash("error", "You do not have permission to do that!");
          res.redirect("back");
        }
      }
    });
  } else {
    req.flash("error", "You need to login to do that!");
    res.redirect("/login");
  }
}

//check if login or not
middlewareObj.isLoggedIn = function(req, res, next){
  if(req.isAuthenticated()){
    return next();
  } else {
    req.flash("error", "You need to login to do that!");
    res.redirect("/login");
  }
}

//check the ownship of review
middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

//check if the review exists
middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};


module.exports = middlewareObj;