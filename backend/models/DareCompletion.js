const mongoose = require('mongoose');

const dareCompletionSchema = new mongoose.Schema({
  dareCardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DareCard',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proofType: {
    type: String,
    enum: ['photo', 'video', 'text'],
    sparse: true
  },
  proofUrl: {
    type: String,
    sparse: true
  },
  skipped: {
    type: Boolean,
    default: false
  },
  ratingByPartner: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    sparse: true
  },
  reactionEmoji: {
    type: String,
    sparse: true
  },
  completedAt: {
    type: Date,
    sparse: true
  }
});

module.exports = mongoose.model('DareCompletion', dareCompletionSchema);
