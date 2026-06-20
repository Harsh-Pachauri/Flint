// controllers/index.js
const authController = require('./authController');
const profileController = require('./profileController');
const discoveryController = require('./discoveryController');
const recommendationController = require('./recommendationController');
const matchController = require('./matchController');
const playroomController = require('./playroomController');
const dareController = require('./dareController');
const storyController = require('./storyController');
const wyrController = require('./wyrController');
const gamificationController = require('./gamificationController');
const confessionController = require('./confessionController');
const pollController = require('./pollController');
const commentController = require('./commentController');
const reactionController = require('./reactionController');
const statsController = require('./statsController');

module.exports = {
  authController,
  profileController,
  discoveryController,
  recommendationController,
  matchController,
  playroomController,
  dareController,
  storyController,
  wyrController,
  gamificationController,
  confessionController,
  pollController,
  commentController,
  reactionController,
  statsController
};
