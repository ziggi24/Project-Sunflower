const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first: { type: String, required: true, minlength: 2 },
  last: { type: String, required: true, minlength: 2 },
  email: { type: String, required: true, minlength: 5 },
  pass: { type: String, required: true, minlength: 8 },
  dateJoined: { type: Date, required: true, default: Date.now() },
  petals: {
    red: { type: Number, min: 0, max: 255, default: 200 },
    green: { type: Number, min: 0, max: 255, default: 200 },
    blue: { type: Number, min: 0, max: 255, default: 200 },
  },
  stem: {
    red: { type: Number, min: 0, max: 255, default: 80 },
    green: { type: Number, min: 0, max: 255, default: 160 },
    blue: { type: Number, min: 0, max: 255, default: 40 },
  },
  flower: { type: String, required: true, default: "Sunflower" },
})

const User = mongoose.model('User', userSchema);

module.exports = User;