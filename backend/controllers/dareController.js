const { DareSpin, DareConsent, DareCard, DareCompletion, PlayroomSession, DareRouletteSession, Notification } = require('../models');

// Spin the wheel
exports.spinWheel = async (req, res) => {
  try {
    const { drSessionId } = req.params;
    const userId = req.user.userId;

    const drSession = await DareRouletteSession.findById(drSessionId);

    if (!drSession) {
      return res.status(404).json({ error: 'Dare Roulette session not found' });
    }

    const playSession = await PlayroomSession.findById(drSession.sessionId);

    if (!playSession) {
      return res.status(404).json({ error: 'Play session not found' });
    }

    // Verify it's calling user's turn (currentRound % 2 check)
    if (playSession.currentTurnUserId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'It is not your turn' });
    }

    // Spin and land on category
    const categories = ['dare', 'truth', 'challenge'];
    const landedCategory = categories[Math.floor(Math.random() * categories.length)];

    const spin = new DareSpin({
      drSessionId,
      spinByUserId: userId,
      landedCategory,
      roundNumber: playSession.currentRound,
      spunAt: new Date()
    });

    await spin.save();

    res.status(201).json({
      spinId: spin._id,
      landedCategory,
      roundNumber: spin.roundNumber,
      message: `Landed on ${landedCategory}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit consent for dare category
exports.submitConsent = async (req, res) => {
  try {
    const { spinId } = req.params;
    const userId = req.user.userId;
    const { accepted } = req.body;

    if (typeof accepted !== 'boolean') {
      return res.status(400).json({ error: 'Invalid consent value' });
    }

    const spin = await DareSpin.findById(spinId);

    if (!spin) {
      return res.status(404).json({ error: 'Spin not found' });
    }

    // Record consent
    const consent = new DareConsent({
      spinId,
      userId,
      accepted,
      respondedAt: new Date()
    });

    await consent.save();

    // Check if both users have consented
    const consents = await DareConsent.find({ spinId });

    if (consents.length === 2 && consents.every(c => c.accepted)) {
      // Generate AI dare and create DareCard
      const dareText = generateAIDare(spin.landedCategory);
      const difficulty = Math.floor(Math.random() * 5) + 1;

      // Alternate who gets the dare
      const otherUserId = consents.find(c => c.userId.toString() !== userId.toString()).userId;

      const dareCard = new DareCard({
        spinId,
        assignedToUserId: otherUserId,
        dareText,
        category: spin.landedCategory,
        difficulty,
        timeoutSecs: 300
      });

      await dareCard.save();

      // Notify the assigned user
      const notif = new Notification({
        userId: otherUserId,
        type: 'system',
        title: 'New Dare!',
        body: dareText.substring(0, 50) + '...',
        read: false
      });

      await notif.save();

      return res.json({
        consent: consent._id,
        allConsented: true,
        dareCard: {
          dareCardId: dareCard._id,
          assignedTo: otherUserId,
          dareText,
          difficulty,
          timeoutSecs: dareCard.timeoutSecs
        }
      });
    }

    res.status(201).json({
      consent: consent._id,
      accepted,
      allConsented: consents.length === 2 && consents.every(c => c.accepted),
      message: accepted ? 'Consent recorded' : 'Dare skipped'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Generate mock AI dare
function generateAIDare(category) {
  const dares = {
    dare: 'Send a flirty message to your partner',
    truth: 'What is your biggest turn-on?',
    challenge: 'Do 20 push-ups for your partner'
  };
  return dares[category] || 'Complete a fun challenge!';
}

// Submit dare completion
exports.completeDare = async (req, res) => {
  try {
    const { dareCardId } = req.params;
    const userId = req.user.userId;
    const { proofType, proofUrl, skipped } = req.body;

    const dareCard = await DareCard.findById(dareCardId);

    if (!dareCard) {
      return res.status(404).json({ error: 'Dare card not found' });
    }

    if (dareCard.assignedToUserId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'This dare is not assigned to you' });
    }

    const spin = await DareSpin.findById(dareCard.spinId);
    if (!spin) {
      return res.status(404).json({ error: 'Associated spin not found' });
    }

    const drSession = await DareRouletteSession.findById(spin.drSessionId);
    if (!drSession) {
      return res.status(404).json({ error: 'Dare roulette session not found' });
    }

    // Handle skip - decrement skip tokens
    if (skipped) {
      const spinByUserId = spin.spinByUserId;

      if (spinByUserId.toString() === userId.toString()) {
        drSession.skipTokensUser1 = Math.max(0, drSession.skipTokensUser1 - 1);
      } else {
        drSession.skipTokensUser2 = Math.max(0, drSession.skipTokensUser2 - 1);
      }

      await drSession.save();
    }

    // Create completion record
    const completion = new DareCompletion({
      dareCardId,
      userId,
      proofType: skipped ? null : proofType,
      proofUrl: skipped ? null : proofUrl,
      skipped,
      completedAt: skipped ? null : new Date()
    });

    await completion.save();

    // Notify partner to rate
    const otherUserId = spin.spinByUserId.toString() === userId.toString()
      ? dareCard.assignedToUserId
      : spin.spinByUserId;
    const notif = new Notification({
      userId: otherUserId,
      type: 'system',
      title: 'Rate the Dare',
      body: 'Your partner completed the dare! Rate it.',
      read: false
    });

    await notif.save();

    res.status(201).json({
      completionId: completion._id,
      skipped,
      message: skipped ? 'Dare skipped' : 'Dare completion submitted for rating'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rate partner's dare completion
exports.rateDareCompletion = async (req, res) => {
  try {
    const { completionId } = req.params;
    const userId = req.user.userId;
    const { rating, reactionEmoji } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const completion = await DareCompletion.findById(completionId);

    if (!completion) {
      return res.status(404).json({ error: 'Completion not found' });
    }

    // Verify rating is from the other user
    const dareCard = await DareCard.findById(completion.dareCardId);
    if (!dareCard) {
      return res.status(404).json({ error: 'Dare card not found' });
    }

    if (completion.userId.toString() === userId.toString()) {
      return res.status(403).json({ error: 'You cannot rate your own completion' });
    }

    const spin = await DareSpin.findById(dareCard.spinId);
    if (!spin) {
      return res.status(404).json({ error: 'Associated spin not found' });
    }

    const drSession = await DareRouletteSession.findById(spin.drSessionId);
    if (!drSession) {
      return res.status(404).json({ error: 'Dare roulette session not found' });
    }

    const playSession = await PlayroomSession.findById(drSession.sessionId);
    if (!playSession) {
      return res.status(404).json({ error: 'Play session not found' });
    }

    completion.ratingByPartner = rating;
    completion.reactionEmoji = reactionEmoji || '👍';
    await completion.save();

    // Update PlayroomScore
    const PlayroomScore = require('../models').PlayroomScore;
    let score = await PlayroomScore.findOne({
      playroomId: playSession.playroomId,
      userId: completion.userId
    });

    if (!score) {
      score = new PlayroomScore({
        playroomId: playSession.playroomId,
        userId: completion.userId,
        daresCompleted: 1
      });
    } else {
      score.daresCompleted += 1;
    }

    await score.save();

    res.json({
      completionId: completion._id,
      rating,
      reactionEmoji: completion.reactionEmoji,
      message: 'Dare rated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
