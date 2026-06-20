const mongoose = require('mongoose');

const wyrQuestionSchema = new mongoose.Schema({
  wyrSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WYRSession',
    required: true
  },
  optionA: {
    type: String,
    required: true
  },
  optionB: {
    type: String,
    required: true
  },
  basedOnProfile: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      profileField: String
    }
  ],
  questionNumber: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('WYRQuestion', wyrQuestionSchema);
