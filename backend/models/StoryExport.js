const mongoose = require('mongoose');

const storyExportSchema = new mongoose.Schema({
  storySessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorySession',
    required: true
  },
  fullText: {
    type: String,
    required: true
  },
  cardImageUrl: {
    type: String,
    sparse: true
  },
  isShared: {
    type: Boolean,
    default: false
  },
  exportedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StoryExport', storyExportSchema);
