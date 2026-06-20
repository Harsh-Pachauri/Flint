const mongoose = require('mongoose');

const wyrAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WYRQuestion',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chosenOption: {
    type: String,
    enum: ['A', 'B'],
    required: true
  },
  isRevealed: {
    type: Boolean,
    default: false
  },
  reactionEmoji: {
    type: String,
    sparse: true
  },
  discussionNote: {
    type: String,
    sparse: true
  },
  answeredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WYRAnswer', wyrAnswerSchema);
