const mongoose = require('mongoose');

const moodSchema = mongoose.Schema({
  mood: {
    type: Number, min: 0, max: 5, required: true,
  },
  outlook: {
    type: Number, min: 0, max: 5, required: true,
  },
  frequentEmotion: { type: String, required: true },
  notes: { type: String },
  dateAdded: { type: Date, default: Date.now() },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Mood = mongoose.model('Mood', moodSchema);

module.exports = Mood;
