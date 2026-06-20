// routes/index.js
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers');
const onboardingController = require('../controllers/onboardingController');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const errorHandler = require('../middleware/errorHandler');
const { uploadPhotos } = require('../config/multer');

// ============ AUTH ROUTES (6 endpoints) ============
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authMiddleware, authController.logout);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);

// ============ PROFILE ROUTES (7 endpoints) ============
router.post('/profile', authMiddleware, profileController.createProfile);
router.get('/profile/me', authMiddleware, profileController.getMyProfile);
router.put('/profile/me', authMiddleware, profileController.updateMyProfile);
router.post('/profile/ai-assessment', authMiddleware, profileController.submitAIAssessment);
// Publicly view a user's profile (no auth required)
router.get('/profile/:userId', profileController.getUserProfile);
router.post('/profile/photos', authMiddleware, uploadPhotos.array('photos', 6), profileController.uploadPhotos);
router.delete('/profile/photos/:photoId', authMiddleware, profileController.deletePhoto);

// ============ DISCOVERY ROUTES (6 endpoints) ============
router.get('/feed', authMiddleware, discoveryController.getFeed);
router.get('/recommendations/:userId', authMiddleware, recommendationController.getRecommendations);
router.post('/swipe', authMiddleware, discoveryController.swipe);
router.get('/swipes/incoming', authMiddleware, discoveryController.getIncomingSwipes);
router.post('/swipes/:swipeId/accept', authMiddleware, discoveryController.acceptSwipe);
router.post('/swipes/:swipeId/reject', authMiddleware, discoveryController.rejectSwipe);
router.get('/colleges/search', authMiddleware, discoveryController.searchColleges);

// ============ MATCHES & CHAT ROUTES (6 endpoints) ============
router.get('/matches', authMiddleware, matchController.getMatches);
router.get('/matches/:matchId', authMiddleware, matchController.getMatchDetail);
router.post('/matches/:matchId/compatibility-test', authMiddleware, matchController.submitCompatibilityTest);
router.get('/matches/:matchId/messages', authMiddleware, matchController.getMessages);
router.delete('/matches/:matchId', authMiddleware, matchController.unmatch);
// WebSocket route handled separately in socket.io configuration

// ============ PLAYROOM ROUTES (5 endpoints) ============
router.get('/matches/:matchId/playroom', authMiddleware, playroomController.getPlayroom);
router.post('/matches/:matchId/playroom/activate', authMiddleware, playroomController.activatePlayroom);
router.post('/playroom/:playroomId/session', authMiddleware, playroomController.startGameSession);
router.patch('/playroom/:playroomId/session/:sessionId/end', authMiddleware, playroomController.endGameSession);
router.get('/playroom/:playroomId/scores', authMiddleware, playroomController.getPlayroomScores);

// ============ DARE ROULETTE ROUTES (4 endpoints) ============
router.post('/dare/:drSessionId/spin', authMiddleware, dareController.spinWheel);
router.post('/dare/spin/:spinId/consent', authMiddleware, dareController.submitConsent);
router.post('/dare/card/:dareCardId/complete', authMiddleware, dareController.completeDare);
router.patch('/dare/completion/:completionId/rate', authMiddleware, dareController.rateDareCompletion);

// ============ STORY BUILDER ROUTES (4 endpoints) ============
router.get('/story/:storySessionId', authMiddleware, storyController.getStorySession);
router.post('/story/:storySessionId/entry', authMiddleware, storyController.addEntry);
router.post('/story/:storySessionId/like/:entryId', authMiddleware, storyController.likeEntry);
router.post('/story/:storySessionId/export', authMiddleware, storyController.exportStory);

// ============ WOULD YOU RATHER ROUTES (3 endpoints) ============
router.get('/wyr/:wyrSessionId', authMiddleware, wyrController.getWYRSession);
router.post('/wyr/question/:questionId/answer', authMiddleware, wyrController.submitAnswer);
router.patch('/wyr/answer/:answerId/react', authMiddleware, wyrController.reactToAnswer);

// ============ CONFESSION ROUTES ============
router.post('/confessions', authMiddleware, confessionController.createConfession);
router.get('/confessions/trending', authMiddleware, confessionController.getTrendingConfessions);
router.get('/confessions/me', authMiddleware, confessionController.getMyConfessions);
router.get('/confessions/pending', authMiddleware, confessionController.getPendingConfessions);
router.patch('/confessions/:id/approve', authMiddleware, confessionController.approveConfession);
router.patch('/confessions/:id/reject', authMiddleware, confessionController.rejectConfession);
router.get('/confessions', authMiddleware, confessionController.getConfessions);
router.get('/confessions/:id', authMiddleware, confessionController.getConfessionById);
router.delete('/confessions/:id', authMiddleware, confessionController.deleteConfession);
router.patch('/confessions/:id', authMiddleware, confessionController.updateConfession);

// ============ POLL ROUTES ============
router.post('/polls', authMiddleware, pollController.createPoll);
router.get('/polls', authMiddleware, pollController.getPolls);
router.post('/polls/:pollId/vote', authMiddleware, pollController.votePoll);
router.get('/polls/:pollId/results', authMiddleware, pollController.getPollResults);

// Onboarding
router.post('/onboarding/complete', authMiddleware, onboardingController.completeOnboarding);

// ============ COMMENT ROUTES ============
router.post('/comments', authMiddleware, commentController.addComment);
router.get('/comments', authMiddleware, commentController.getComments);
router.delete('/comments/:id', authMiddleware, commentController.deleteComment);

// ============ REACTION ROUTES ============
router.post('/reactions', authMiddleware, reactionController.react);
router.post('/reactions/toggle', authMiddleware, reactionController.toggleReaction);
router.delete('/reactions/:id', authMiddleware, reactionController.removeReaction);

// ============ CONFESSION STATS ROUTES ============
router.get('/stats/confessions', authMiddleware, statsController.getConfessionStats);
router.get('/tags/trending', authMiddleware, statsController.getTrendingTags);

// ============ ADMIN / MODERATION ROUTES ============
// Admin routes now integrated into confession routes above

// ============ GAMIFICATION & FEED ROUTES (5 endpoints) ============
router.post('/rewards/claim', authMiddleware, gamificationController.claimReward);
router.get('/rewards/me', authMiddleware, gamificationController.getRewardStatus);
router.get('/feed/news', authMiddleware, gamificationController.getNewsFeed);
router.get('/notifications', authMiddleware, gamificationController.getNotifications);
router.patch('/notifications/:notifId/read', authMiddleware, gamificationController.markNotificationAsRead);
router.patch('/notifications/read-all', authMiddleware, gamificationController.markAllNotificationsAsRead);

// Error handling
router.use(errorHandler);

module.exports = router;
