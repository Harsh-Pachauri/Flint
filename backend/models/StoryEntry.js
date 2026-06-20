const mongoose = require('mongoose');

const storyEntrySchema = new mongoose.Schema({
  storySessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorySession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  nudgeReason: {
    type: String,
    sparse: true
  },
  likedByPartner: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StoryEntry', storyEntrySchema);
