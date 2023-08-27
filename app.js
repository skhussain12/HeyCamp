require('dotenv').config();

var express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  passport = require("passport"),
  LocalStrategy = require("passport-local"),
  User = require("./models/user"),
  methodOverride = require("method-override"),
  flash = require("connect-flash");

// RESTful API
var commentRoutes = require("./routes/comments"),
  campgroundRoutes = require("./routes/campgrounds"),
  indexRoutes = require("./routes/index"),
  reviewRoutes = require("./routes/reviews");

//connect mongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Hey_Camp1');

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB();// seed the database

app.locals.moment = require("moment");

//passport config
app.use(require("express-session")({
  secret: "Once again Rusty wins cutest dog!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(async function (req, res, next) {
  res.locals.currentUser = req.user;
  if (req.user) {
    try {
      let user = await User.findById(req.user._id).populate('notifications', null, { isRead: false }).exec();
      res.locals.notifications = user.notifications.reverse();
    } catch (err) {
      console.log(err.message);
    }
  }
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});


//requiring routes
app.use("/", indexRoutes);
app.use("/campgrounds/", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds/:id/reviews", reviewRoutes);

app.listen(3000, function () {
  console.log("The HeyCamp server has started!");
});
