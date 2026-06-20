const mongoose = require('mongoose');

const compatibilityTestSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  answers: [
    {
      question: String,
      user1Answer: String,
      user2Answer: String
    }
  ],
  compatibilityScore: {
    type: Number,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    sparse: true
  }
});

module.exports = mongoose.model('CompatibilityTest', compatibilityTestSchema);
