const mongoose = require('mongoose');

const playroomScoreSchema = new mongoose.Schema({
  playroomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playroom',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  daresCompleted: {
    type: Number,
    default: 0
  },
  truthsAnswered: {
    type: Number,
    default: 0
  },
  challengesWon: {
    type: Number,
    default: 0
  },
  storyEntries: {
    type: Number,
    default: 0
  },
  wyrAnswers: {
    type: Number,
    default: 0
  },
  badge: {
    type: String,
    sparse: true
  }
});

module.exports = mongoose.model('PlayroomScore', playroomScoreSchema);
