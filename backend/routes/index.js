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
const requireAdmin = require('../middleware/requireAdmin');
const validateObjectIdParam = require('../middleware/validateObjectIdParam');
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
router.get('/profile/:userId', validateObjectIdParam('userId'), profileController.getUserProfile);
router.post('/profile/photos', authMiddleware, uploadPhotos.array('photos', 6), profileController.uploadPhotos);
router.delete('/profile/photos/:photoId', authMiddleware, validateObjectIdParam('photoId'), profileController.deletePhoto);

// ============ DISCOVERY ROUTES (6 endpoints) ============
router.get('/feed', authMiddleware, discoveryController.getFeed);
router.get('/recommendations/:userId', authMiddleware, validateObjectIdParam('userId'), recommendationController.getRecommendations);
router.post('/swipe', authMiddleware, discoveryController.swipe);
router.get('/swipes/incoming', authMiddleware, discoveryController.getIncomingSwipes);
router.post('/swipes/:swipeId/accept', authMiddleware, validateObjectIdParam('swipeId'), discoveryController.acceptSwipe);
router.post('/swipes/:swipeId/reject', authMiddleware, validateObjectIdParam('swipeId'), discoveryController.rejectSwipe);
router.get('/colleges/search', authMiddleware, discoveryController.searchColleges);

// ============ MATCHES & CHAT ROUTES (6 endpoints) ============
router.get('/matches', authMiddleware, matchController.getMatches);
router.get('/matches/:matchId', authMiddleware, validateObjectIdParam('matchId'), matchController.getMatchDetail);
router.post('/matches/:matchId/compatibility-test', authMiddleware, validateObjectIdParam('matchId'), matchController.submitCompatibilityTest);
router.get('/matches/:matchId/messages', authMiddleware, validateObjectIdParam('matchId'), matchController.getMessages);
router.delete('/matches/:matchId', authMiddleware, validateObjectIdParam('matchId'), matchController.unmatch);
// WebSocket route handled separately in socket.io configuration

// ============ PLAYROOM ROUTES (5 endpoints) ============
router.get('/matches/:matchId/playroom', authMiddleware, validateObjectIdParam('matchId'), playroomController.getPlayroom);
router.post('/matches/:matchId/playroom/activate', authMiddleware, validateObjectIdParam('matchId'), playroomController.activatePlayroom);
router.post('/playroom/:playroomId/session', authMiddleware, validateObjectIdParam('playroomId'), playroomController.startGameSession);
router.patch('/playroom/:playroomId/session/:sessionId/end', authMiddleware, validateObjectIdParam('playroomId'), validateObjectIdParam('sessionId'), playroomController.endGameSession);
router.get('/playroom/:playroomId/scores', authMiddleware, validateObjectIdParam('playroomId'), playroomController.getPlayroomScores);

// ============ DARE ROULETTE ROUTES (4 endpoints) ============
router.post('/dare/:drSessionId/spin', authMiddleware, validateObjectIdParam('drSessionId'), dareController.spinWheel);
router.post('/dare/spin/:spinId/consent', authMiddleware, validateObjectIdParam('spinId'), dareController.submitConsent);
router.post('/dare/card/:dareCardId/complete', authMiddleware, validateObjectIdParam('dareCardId'), dareController.completeDare);
router.patch('/dare/completion/:completionId/rate', authMiddleware, validateObjectIdParam('completionId'), dareController.rateDareCompletion);

// ============ STORY BUILDER ROUTES (4 endpoints) ============
router.get('/story/:storySessionId', authMiddleware, validateObjectIdParam('storySessionId'), storyController.getStorySession);
router.post('/story/:storySessionId/entry', authMiddleware, validateObjectIdParam('storySessionId'), storyController.addEntry);
router.post('/story/:storySessionId/like/:entryId', authMiddleware, validateObjectIdParam('storySessionId'), validateObjectIdParam('entryId'), storyController.likeEntry);
router.post('/story/:storySessionId/export', authMiddleware, validateObjectIdParam('storySessionId'), storyController.exportStory);

// ============ WOULD YOU RATHER ROUTES (3 endpoints) ============
router.get('/wyr/:wyrSessionId', authMiddleware, validateObjectIdParam('wyrSessionId'), wyrController.getWYRSession);
router.post('/wyr/question/:questionId/answer', authMiddleware, validateObjectIdParam('questionId'), wyrController.submitAnswer);
router.patch('/wyr/answer/:answerId/react', authMiddleware, validateObjectIdParam('answerId'), wyrController.reactToAnswer);

// ============ CONFESSION ROUTES ============
router.post('/confessions', authMiddleware, confessionController.createConfession);
router.get('/confessions/trending', authMiddleware, confessionController.getTrendingConfessions);
router.get('/confessions/me', authMiddleware, confessionController.getMyConfessions);
router.get('/confessions/pending', authMiddleware, requireAdmin, confessionController.getPendingConfessions);
router.patch('/confessions/:id/approve', authMiddleware, validateObjectIdParam('id'), requireAdmin, confessionController.approveConfession);
router.patch('/confessions/:id/reject', authMiddleware, validateObjectIdParam('id'), requireAdmin, confessionController.rejectConfession);
router.get('/confessions', authMiddleware, confessionController.getConfessions);
router.get('/confessions/:id', authMiddleware, validateObjectIdParam('id'), confessionController.getConfessionById);
router.delete('/confessions/:id', authMiddleware, validateObjectIdParam('id'), confessionController.deleteConfession);
router.patch('/confessions/:id', authMiddleware, validateObjectIdParam('id'), confessionController.updateConfession);

// ============ POLL ROUTES ============
router.post('/polls', authMiddleware, pollController.createPoll);
router.get('/polls', authMiddleware, pollController.getPolls);
router.post('/polls/:pollId/vote', authMiddleware, validateObjectIdParam('pollId'), pollController.votePoll);
router.get('/polls/:pollId/results', authMiddleware, validateObjectIdParam('pollId'), pollController.getPollResults);

// Onboarding
router.post('/onboarding/complete', authMiddleware, onboardingController.completeOnboarding);

// ============ COMMENT ROUTES ============
router.post('/comments', authMiddleware, commentController.addComment);
router.get('/comments', authMiddleware, commentController.getComments);
router.delete('/comments/:id', authMiddleware, validateObjectIdParam('id'), commentController.deleteComment);

// ============ REACTION ROUTES ============
router.post('/reactions', authMiddleware, reactionController.react);
router.post('/reactions/toggle', authMiddleware, reactionController.toggleReaction);
router.delete('/reactions/:id', authMiddleware, validateObjectIdParam('id'), reactionController.removeReaction);

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
router.patch('/notifications/:notifId/read', authMiddleware, validateObjectIdParam('notifId'), gamificationController.markNotificationAsRead);
router.patch('/notifications/read-all', authMiddleware, gamificationController.markAllNotificationsAsRead);

// Error handling
router.use(errorHandler);

module.exports = router;
