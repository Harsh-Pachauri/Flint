const mongoose = require('mongoose');

const dareCardSchema = new mongoose.Schema({
  spinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DareSpin',
    required: true
  },
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dareText: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  difficulty: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    required: true
  },
  timeoutSecs: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('DareCard', dareCardSchema);
