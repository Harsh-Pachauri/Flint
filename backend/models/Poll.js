const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  votes: {
    type: Number,
    default: 0
  }
}, { _id: false });

const pollSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [pollOptionSchema],
    validate: {
      validator: (v) => Array.isArray(v) && v.length >= 2,
      message: 'A poll requires at least 2 options'
    }
  },
  voters: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Poll', pollSchema);
