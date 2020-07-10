const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const flash = require('connect-flash');
const multer = require('multer');
const path = require('path');
const passport = require('passport');
const { Strategy } = require('passport-local');


const router = express.Router();

const db = require('../models');

const storage = multer.diskStorage({
  destination: './uploads/images',
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err)

      cb(null, raw.toString('hex') + path.extname(file.originalname))
    })
  }
})

const upload = multer({
  dest: path.resolve(__dirname, './uploads/images'),
  storage: storage,
});


// Configure the local strategy for use by Passport.
// ( taken from the passport.js docs, refactored to be async
//   and to use bcrypt to compare hashed passwords )
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `next` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use('local-login', new Strategy(async (username, password, next) => {
  try {
    const user = await db.User.findOne({ username });
    if (!user) { return next(null, false, { message: 'Invalid Username' }); }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      next(null, false, { message: 'Password or Email is incorrect.' });
    }
    return next(null, user);
  } catch (err) {
    console.log(err);
    next(null, false, { message: err.message });
  }
}));
// Configure Passport authenticated session persistence.
// (from passport.js docs)
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser((user, next) => {
  next(null, user.id);
});

passport.deserializeUser((id, next) => {
  db.User.findById(id, (err, user) => {
    if (err) { return next(err); }
    next(null, user);
  });
});

router.use(passport.initialize());
router.use(passport.session());

// login show route
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Login post, passing auth to passport middleware
router.post('/login', passport.authenticate('local-login', {
  failureRedirect: '/login',
}), (req, res) => {
  res.redirect(`/profile/${req.user.username}`);
});

// logout passed to passport method logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Signup Post
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
    res.send({ message: 'Internal Server Error' });
  }
});

// profile show route
router.get('/profile/:username', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    console.log(req.session.passport.user);
    const user = await db.User.findById({ _id: req.session.passport.user });
    const context = {
      user,
    };
    console.log(context);
    return res.render('auth/profile', context);
  } catch (err) {
    console.log(err);
    return res.json({
      message: err.message,
    });
  }
});

// mood post route
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
    if (newMood.mood === 0) { user.petals.red += 20 }
    else if (newMood.mood === 1) { user.petals.red += 10 }
    else if (newMood.mood === 2) { user.petals.red += 5 }
    else if (newMood.mood === 4) { user.petals.red -= 10 }
    else if (newMood.mood === 5) { user.petals.red -= 20 }
    await user.save();
    res.redirect(`/profile/${req.user.username}`);
  } catch (err) {
    console.log(err);
  }
});

// profile picture update route 
router.post('/profile/:username/upload', require('connect-ensure-login').ensureLoggedIn(), upload.single('photo'), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    if (req.file) {
      console.log(req.file)
      user.image = req.file.path;
      user.save();
      res.redirect(`/profile/${user.username}`)
    } else {
      res.json({ message: 'couldnt find file' })
    }
  } catch (err) {
    console.log(err);
    return new Error(err);
  }
})

router.get('/profile/:username/timeline', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    return res.render('auth/timeline', { user: user });
  } catch (err) {
    console.log(err)
    return new Error(err);
  }
})

// mood show route
router.get('/profile/:username/mood/:moodId', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const foundMood = await db.Mood.findById({ _id: req.params.moodId });
    console.log(foundMood);
    const context = { mood: foundMood };
    res.render('mood/show', context);
  } catch (err) {
    console.log(err);
  }
});
router.get('/profile/:username/mood', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user }).populate('log');
    const context = {
      user: user,
      log: user.log,
    }
    console.log(context);
    return res.render('mood/index', context);
  } catch (err) {
    console.log(err)
    return new Error(err);
  }


})

module.exports = router;
