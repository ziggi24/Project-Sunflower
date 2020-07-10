const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const passport = require('passport')
const Strategy = require('passport-local').Strategy;

const db = require('../models');

// Configure the local strategy for use by Passport.
// (taken from the passport.js docs, refactored to be async)
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `next` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use('local-login', new Strategy(async (username, password, next) => {
  try {
    const user = await db.User.findOne({ username: username });
    if (!user) { return next(null, false, { message: "Invalid Username" }); }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      next(null, false, { message: 'Password or Email is incorrect.' });
    }
    return next(null, user);
  } catch (err) {
    console.log(err)
    next(null, false, { message: err.message })
  }
  db.User.findByUsername(username, function (err, user) {
    if (err) { return next(err); }

  });
}));
// Configure Passport authenticated session persistence.
// (from passport.js docs)
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, next) {
  next(null, user.id);
});

passport.deserializeUser(function (id, next) {
  db.User.findById(id, function (err, user) {
    if (err) { return next(err); }
    next(null, user);
  });
});

router.use(passport.initialize());
router.use(passport.session());

router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.post('/login',
  passport.authenticate('local-login', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(`/profile/${req.user.username}`);
  });

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
router.post('/signup', async (req, res, next) => {
  try {
    const foundUser = await db.User.findOne({ email: req.body.email });
    if (foundUser) {
      return res.send({ message: 'Email is already in use' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    const newUser = await db.User.create(req.body);
    res.redirect('/login');
  } catch (err) {
    console.log(err);
    res.send({ message: 'Internal Server Error' })
  }
});

router.get('/profile/:username', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    console.log(req.session.passport.user)
    const user = await db.User.findById({ _id: req.session.passport.user });
    const context = {
      user: user,
    }
    console.log(context)
    return res.render('auth/profile', context);
  } catch (err) {
    console.log(err)
    return res.json({
      message: err.message,
    })
  }
});

router.post('/profile/:username', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    const newMood = await db.Mood.create({
      mood: req.body.mood,
      outlook: req.body.outlook,
      frequentEmotion: req.body.frequentEmotion,
      notes: req.body.notes,
      user: user._id,
    });
    await user.log.push(newMood._id);
    await user.save();
    res.redirect(`/profile/${req.user.username}`);

  } catch (err) {
    console.log(err)
  }

});
router.get('/profile/:username/:moodId', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const foundMood = await db.Mood.findById({ _id: req.params.moodId })
    console.log(foundMood);
    const context = { mood: foundMood };
    res.render('mood/show', context)
  } catch (err) {
    console.log(err)
  }

})

module.exports = router;