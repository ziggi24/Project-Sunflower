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

const unique = (value, index, self) => {
  return self.indexOf(value) === index
}
const calcOccur = (arr, uniques) =>{
  let finalArr = new Array(uniques.length).fill(0);
  for(let i = 0; i < uniques.length; i++){
    for (let j = 0; j < arr.length; j++){
      if(uniques[i] === arr[j]){
        finalArr[i] +=1 || 0;
        // console.log(finalArr)
      }
    }
  }
  return finalArr;
}

// homepage route
router.get('/', async (req, res) => {
  try {
    if(req.isAuthenticated()){
      const user = await db.User.findById({ _id: req.session.passport.user })
      const context = {
        user: user,
      }
      console.log(context);
      res.render('index', context);
    } else {
      const context = {
        user: null,
      }
      res.render('index', context);
    }
  } catch (err) {
    console.log(err)
  }
  
});

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
    console.log(req.body);
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

// TODO Add /profile redirect here
router.get('/profile',require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    return res.redirect(`/profile/${req.user.username}`);
   } catch (err) {
      console.log(err)
   }
  });


// profile show route
router.get('/profile/:username', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    console.log(req.session.passport.user);
    const user = await db.User.findById({ _id: req.session.passport.user }).populate('log');
    const moodData = calcOccur(user.log.map(entry => entry.mood),[1,2,3,4,5]);
    const outlookData = calcOccur(user.log.map(entry => entry.outlook),[1,2,3,4,5]);
    const emotionsLabel = user.log.map(entry => entry.frequentEmotion).filter(unique);
    const emotionsData = calcOccur(user.log.map(entry => entry.frequentEmotion), emotionsLabel);

    const context = {
      user,
      moodData,
      outlookData,
      emotionsData,
      emotionsLabel,
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
router.get('/profile/:username/update', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    res.render('auth/update', {user: user});
  } catch (err) {
    console.log(err)
  }
});
router.post('/profile/:username/update', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    if(req.body.password){
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(req.body.password, salt);
      req.body.password = hash;
      const user = await db.User.findByIdAndUpdate(req.session.passport.user, {
        username: req.body.username,
        first: req.body.first,
        last: req.body.last,
        flower: req.body.flower,
        email: req.body.email,
        password: req.body.password,
      });
      console.log(user)
      res.redirect(`/profile/${user.username}`)
    } else {
      const user = await db.User.findByIdAndUpdate(req.session.passport.user, {
        username: req.body.username,
        first: req.body.first,
        last: req.body.last,
        flower: req.body.flower,
        email: req.body.email,
      });
      console.log(user)
      res.redirect(`/profile/${user.username}`)
    }
    // res.redirect(`/profile/${user.username}`)
  } catch (err) {
    console.log(err);
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
    const log = await db.Mood.find({user: user._id}).sort({dateAdded: 'desc'})
    return res.render('auth/timeline', { user: user, log: log });
  } catch (err) {
    console.log(err)
    return new Error(err);
  }
})

// mood show route
router.get('/profile/:username/mood/:moodId', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user })
    const foundMood = await db.Mood.findById({ _id: req.params.moodId });
    console.log(foundMood);
    const context = { 
      user: user,
      mood: foundMood 
    };
    res.render('mood/show', context);
  } catch (err) {
    console.log(err);
  }
});
// mood update show page
router.get('/profile/:username/mood/:moodId/update', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user })
    const foundMood = await db.Mood.findById({ _id: req.params.moodId });
    const context = {
      user: user, 
      mood: foundMood,
    }
    res.render('mood/update', context);
  } catch (err) {
    console.log(err)
  }

})
// Mood update route
router.post('/profile/:username/mood/:moodId', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user })
    let foundMood = await db.Mood.findByIdAndUpdate(req.params.moodId, {
      mood: req.body.mood,
      outlook: req.body.outlook,
      frequentEmotion: req.body.frequentEmotion,
      notes: req.body.notes,
    }, {new: true} );
    const context = { 
      user: user,
      mood: foundMood 
    };
    res.render('mood/show', context);
  } catch (err) {
    console.log(err);
  }
});
// mood delete route 
router.post('/profile/:username/mood/:moodId/delete', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try{
    const user = await db.User.findById({ _id: req.session.passport.user });
    const mood = await db.Mood.findByIdAndDelete({_id: req.params.moodId});
    await user.log.remove(mood);
    await user.save();
    res.redirect(`/profile/${user.username}/mood`)
  } catch (err) {
    console.log(err)
  }
})
// Mood index route
router.get('/profile/:username/mood', require('connect-ensure-login').ensureLoggedIn(), async (req, res) => {
  try {
    const user = await db.User.findById({ _id: req.session.passport.user });
    const log = await db.Mood.find({user: user._id}).sort({dateAdded: 'desc'})
    const context = {
      user: user,
      log: log,
    }
    console.log(context);
    return res.render('mood/index', context);
  } catch (err) {
    console.log(err)
    return new Error(err);
  }


})

module.exports = router;
