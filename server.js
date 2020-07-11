const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const { PORT } = process.env;

// const db = require('./models');
const controllers = require('./controllers');

// session config
app.use(session({
  store: new MongoStore({
    url: process.env.MONGODB_URI,
  }),
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
}));

app.use(helmet()); // security middleware which adds HTTP headers
app.use(morgan('tiny')); // logger
app.use(express.json());
app.use(express.static('./public'));
app.use(express.static('./semantic'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(flash()); // for displaying flash messages on reloads and redirects

// error handling middleware
app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
  });
});


// auth routes handled by auth controller
app.use('/', controllers.auth);

app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}`);
});
