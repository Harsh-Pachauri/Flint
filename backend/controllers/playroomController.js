const { Playroom, PlayroomSession, PlayroomScore, Match } = require('../models');

// Fixed prompt bank for Would You Rather sessions. Nothing in this subsystem
// previously created WYRQuestion documents at all (getWYRSession would
// always return an empty question list) — this is what actually seeds a
// playable round when a session starts.
const WOULD_YOU_RATHER_QUESTION_BANK = [
  { optionA: 'A spontaneous weekend road trip', optionB: 'A planned week-long vacation' },
  { optionA: 'Coffee dates', optionB: 'Late-night food runs' },
  { optionA: 'Texting all day', optionB: 'One long call at night' },
  { optionA: 'Meeting the friend group early', optionB: 'Keeping it just us for a while' },
  { optionA: 'A home-cooked dinner', optionB: 'Trying a new restaurant' },
  { optionA: 'Slow burn', optionB: 'Love at first sight' },
  { optionA: 'Beach sunset', optionB: 'City skyline at night' },
  { optionA: 'Deep 2am conversations', optionB: 'Easy, playful banter' },
  { optionA: 'Surprise plans', optionB: 'Knowing the plan in advance' },
  { optionA: 'A love song written about you', optionB: 'A playlist made for you' }
];

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
        unlockedFeatures: ['storyBuilding', 'dareRoulette', 'wouldYouRather'],
        isActive: false
      });
      await playroom.save();
    }

    // Get active session if any
    const activeSession = await PlayroomSession.findOne({
      playroomId: playroom._id,
      status: 'active'
    });

    // The type-specific session id (DareRouletteSession/StorySession/
    // WYRSession) is otherwise only ever handed back once, in
    // startGameSession's response — without resolving it here too, a user
    // who leaves and reopens the playroom mid-game has no way to resume,
    // since every other game endpoint needs that id, not the generic
    // PlayroomSession id.
    let gameSessionId = null;
    if (activeSession) {
      if (activeSession.gameType === 'dareRoulette') {
        const drSession = await require('../models').DareRouletteSession.findOne({ sessionId: activeSession._id });
        gameSessionId = drSession?._id || null;
      } else if (activeSession.gameType === 'storyBuilding') {
        const storySession = await require('../models').StorySession.findOne({ sessionId: activeSession._id });
        gameSessionId = storySession?._id || null;
      } else if (activeSession.gameType === 'wouldYouRather') {
        const wyrSession = await require('../models').WYRSession.findOne({ sessionId: activeSession._id });
        gameSessionId = wyrSession?._id || null;
      }
    }

    res.json({
      playroomId: playroom._id,
      spiceLevel: playroom.spiceLevel,
      unlockedFeatures: playroom.unlockedFeatures,
      isActive: playroom.isActive,
      activeSession: activeSession ? {
        sessionId: activeSession._id,
        gameType: activeSession.gameType,
        currentRound: activeSession.currentRound,
        gameSessionId
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
        unlockedFeatures: ['storyBuilding', 'dareRoulette', 'wouldYouRather'],
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

    const validGameTypes = ['dareRoulette', 'storyBuilding', 'wouldYouRather'];

    if (!gameType || !validGameTypes.includes(gameType)) {
      return res.status(400).json({ error: 'Invalid game type' });
    }

    const playroom = await Playroom.findById(playroomId);

    if (!playroom) {
      return res.status(404).json({ error: 'Playroom not found' });
    }

    // Verify requester is one of the two users in the underlying match
    const match = await Match.findById(playroom.matchId);
    if (!match || !match.userIds.some((u) => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
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
    } else if (gameType === 'wouldYouRather') {
      const { WYRSession, WYRQuestion } = require('../models');
      const questionPrompts = WOULD_YOU_RATHER_QUESTION_BANK;
      gameSession = new WYRSession({
        sessionId: session._id,
        totalQuestions: questionPrompts.length,
        syncScore: 0,
        status: 'active'
      });
      await gameSession.save();

      // Nothing else creates WYRQuestion documents anywhere in this
      // subsystem — without seeding them here, getWYRSession always
      // returns an empty question list and the game has nothing to play.
      await WYRQuestion.insertMany(
        questionPrompts.map((q, index) => ({
          wyrSessionId: gameSession._id,
          optionA: q.optionA,
          optionB: q.optionB,
          questionNumber: index + 1
        }))
      );
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

    // Verify requester is one of the two users in the underlying match
    const authMatch = await Match.findById(playroom.matchId);
    if (!authMatch || !authMatch.userIds.some((u) => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
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
