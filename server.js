const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

const db = require('./models');

app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.static('./public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  store: new MongoStore({
    url: process.env.MONGODB_URI,
  }),
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
  },
}));




app.listen(PORT, () => {
  console.log(`Listening at http://localhost:${PORT}`)
})

