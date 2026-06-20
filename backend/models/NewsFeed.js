const mongoose = require('mongoose');

const newsFeedSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  tags: [String],
  category: {
    type: String,
    enum: ['tips', 'news', 'announcement', 'feature'],
    required: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NewsFeed', newsFeedSchema);
