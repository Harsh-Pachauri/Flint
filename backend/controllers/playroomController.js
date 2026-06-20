const { Playroom, PlayroomSession, PlayroomScore, Match } = require('../models');

// Get playroom state
exports.getPlayroom = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let playroom = await Playroom.findOne({ matchId });

    if (!playroom) {
      // Create new playroom if doesn't exist
      playroom = new Playroom({
        matchId,
        spiceLevel: 1,
        unlockedFeatures: ['storyBuilding', 'dareRoulette'],
        isActive: false
      });
      await playroom.save();
    }

    // Get active session if any
    const activeSession = await PlayroomSession.findOne({
      playroomId: playroom._id,
      status: 'active'
    });

    res.json({
      playroomId: playroom._id,
      spiceLevel: playroom.spiceLevel,
      unlockedFeatures: playroom.unlockedFeatures,
      isActive: playroom.isActive,
      activeSession: activeSession ? {
        sessionId: activeSession._id,
        gameType: activeSession.gameType,
        currentRound: activeSession.currentRound
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Enter the playroom
exports.activatePlayroom = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let playroom = await Playroom.findOne({ matchId });

    if (!playroom) {
      playroom = new Playroom({
        matchId,
        spiceLevel: 1,
        unlockedFeatures: ['storyBuilding', 'dareRoulette'],
        isActive: true
      });
    } else {
      playroom.isActive = true;
    }

    await playroom.save();

    res.json({
      playroomId: playroom._id,
      isActive: true,
      message: 'Playroom activated'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Start a game session
exports.startGameSession = async (req, res) => {
  try {
    const { playroomId } = req.params;
    const userId = req.user.userId;
    const { gameType } = req.body;

    const validGameTypes = ['dareRoulette', 'storyBuilding', 'wyouldYouRather'];

    if (!gameType || !validGameTypes.includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({ error: 'Playroom not found' });
    }

    // Verify game is unlocked
    if (!playroom.unlockedFeatures.includes(gameType)) {
      return res.status(403).json({ error: 'This game is not unlocked' });
    }

    // Create game session
    const session = new PlayroomSession({
      playroomId,
      gameType,
      status: 'active',
      currentRound: 1,
      currentTurnUserId: userId,
      startedAt: new Date()
    });

    await session.save();

    // Create game-specific session document based on gameType
    let gameSession = null;

    if (gameType === 'dareRoulette') {
      const DareRouletteSession = require('../models').DareRouletteSession;
      gameSession = new DareRouletteSession({
        sessionId: session._id,
        skipTokensUser1: 2,
        skipTokensUser2: 2,
        totalRounds: 10,
        status: 'active'
      });
      await gameSession.save();
    } else if (gameType === 'storyBuilding') {
      const StorySession = require('../models').StorySession;
      gameSession = new StorySession({
        sessionId: session._id,
        vibe: 'romantic',
        maxSentences: 20,
        currentPosition: 0,
        currentTurnUserId: userId,
        stalledCount: 0,
        status: 'active'
      });
      await gameSession.save();
    } else if (gameType === 'wyouldYouRather') {
      const WYRSession = require('../models').WYRSession;
      gameSession = new WYRSession({
        sessionId: session._id,
        totalQuestions: 10,
        syncScore: 0,
        status: 'active'
      });
      await gameSession.save();
    }

    res.status(201).json({
      sessionId: session._id,
      gameType,
      gameSession: gameSession?._id,
      message: `${gameType} game started`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// End a game session
exports.endGameSession = async (req, res) => {
  try {
    const { playroomId, sessionId } = req.params;
    const userId = req.user.userId;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({ error: 'Playroom not found' });
    }

    const session = await PlayroomSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.playroomId.toString() !== playroomId) {
      return res.status(403).json({ error: 'Session does not belong to this playroom' });
    }

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    // Get scores for both users
    const match = await Match.findOne({ _id: playroom.matchId });
    const scores = await PlayroomScore.find({ playroomId });

    // Calculate average rating
    const avgRating = scores.reduce((sum, s) => sum + (s.rating || 0), 0) / scores.length;

    // Check if spice level should be upgraded
    if (avgRating >= 4 && playroom.spiceLevel < 5) {
      playroom.spiceLevel += 1;
      playroom.unlockedFeatures.push(`level${playroom.spiceLevel}Features`);
      await playroom.save();
    }

    res.json({
      sessionId: session._id,
      status: 'completed',
      endedAt: session.endedAt,
      spiceLevelUpgraded: avgRating >= 4,
      message: 'Game session ended'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get playroom scores + badge
exports.getPlayroomScores = async (req, res) => {
  try {
    const { playroomId } = req.params;
    const userId = req.user.userId;

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({ error: 'Playroom not found' });
    }

    // Get match to verify authorization
    const match = await Match.findById(playroom.matchId);

    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const scores = await PlayroomScore.find({ playroomId })
      .populate('userId', 'name');

    res.json({
      playroomId,
      scores: scores.map(s => ({
        userId: s.userId._id,
        userName: s.userId.name,
        daresCompleted: s.daresCompleted,
        truthsAnswered: s.truthsAnswered,
        challengesWon: s.challengesWon,
        storyEntries: s.storyEntries,
        wyrAnswers: s.wyrAnswers,
        badge: s.badge
      })),
      spiceLevel: playroom.spiceLevel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
