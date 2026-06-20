const { WYRSession, WYRQuestion, WYRAnswer, PlayroomSession, PlayroomScore } = require('../models');

// Get WYR session + questions
exports.getWYRSession = async (req, res) => {
  try {
    const { wyrSessionId } = req.params;
    const userId = req.user.userId;

    const wyrSession = await WYRSession.findById(wyrSessionId);

    if (!wyrSession) {
      return res.status(404).json({ error: 'WYR session not found' });
    }

    // Get all questions
    const questions = await WYRQuestion.find({ wyrSessionId });

    // Get answers for current user
    const userAnswers = await WYRAnswer.find({
      questionId: { $in: questions.map(q => q._id) },
      userId
    });

    // Build response - only include revealed answers
    const questionsWithAnswers = questions.map(q => {
      const userAnswer = userAnswers.find(a => a.questionId.toString() === q._id.toString());

      return {
        questionId: q._id,
        optionA: q.optionA,
        optionB: q.optionB,
        questionNumber: q.questionNumber,
        userAnswer: userAnswer ? {
          answerId: userAnswer._id,
          chosenOption: userAnswer.chosenOption,
          isRevealed: userAnswer.isRevealed,
          reactionEmoji: userAnswer.reactionEmoji,
          discussionNote: userAnswer.discussionNote
        } : null
      };
    });

    res.json({
      wyrSessionId: wyrSession._id,
      totalQuestions: wyrSession.totalQuestions,
      syncScore: wyrSession.syncScore,
      syncBadge: wyrSession.syncBadge,
      status: wyrSession.status,
      questions: questionsWithAnswers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit answer to a question
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;
    const { chosenOption } = req.body;

    if (!['A', 'B'].includes(chosenOption)) {
      return res.status(400).json({ error: 'Invalid option. Must be A or B.' });
    }

    const question = await WYRQuestion.findById(questionId);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if already answered
    const existingAnswer = await WYRAnswer.findOne({ questionId, userId });

    if (existingAnswer && existingAnswer.isRevealed) {
      return res.status(400).json({ error: 'Already answered this question' });
    }

    // Create or update answer
    const answer = existingAnswer || new WYRAnswer({
      questionId,
      userId,
      chosenOption,
      isRevealed: false
    });

    if (!existingAnswer) {
      answer.chosenOption = chosenOption;
      answer.answeredAt = new Date();
    }

    await answer.save();

    // Increment WYR score for this user when they answer a new question
    if (!existingAnswer) {
      const wyrSession = await WYRSession.findById(question.wyrSessionId);
      if (wyrSession) {
        const playSession = await PlayroomSession.findById(wyrSession.sessionId);
        if (playSession) {
          let score = await PlayroomScore.findOne({
            playroomId: playSession.playroomId,
            userId
          });
          if (!score) {
            score = new PlayroomScore({
              playroomId: playSession.playroomId,
              userId,
              wyrAnswers: 1
            });
          } else {
            score.wyrAnswers += 1;
          }
          await score.save();
        }
      }
    }

    // Check if both users have answered this question
    const allAnswers = await WYRAnswer.find({ questionId });

    if (allAnswers.length === 2) {
      // Reveal both answers
      await WYRAnswer.updateMany(
        { questionId },
        { isRevealed: true }
      );

      // Check if answers match (for sync score)
      const answers = await WYRAnswer.find({ questionId });
      const match = answers[0].chosenOption === answers[1].chosenOption;

      // Update sync score
      const wyrSession = await WYRSession.findById(question.wyrSessionId);

      if (match) {
        wyrSession.syncScore = Math.min(100, wyrSession.syncScore + (100 / wyrSession.totalQuestions));
      }

      // Evaluate badge
      if (wyrSession.syncScore >= 80) {
        wyrSession.syncBadge = '🔥 Perfect Sync';
      } else if (wyrSession.syncScore >= 60) {
        wyrSession.syncBadge = '💫 Great Sync';
      } else if (wyrSession.syncScore >= 40) {
        wyrSession.syncBadge = '👌 Good Sync';
      }

      await wyrSession.save();

      // Emit WebSocket event for reveal
      // io.to(`wyr:${question.wyrSessionId}`).emit('wyr:reveal', { questionId, syncScore: wyrSession.syncScore });

      return res.json({
        answerId: answer._id,
        chosenOption: answer.chosenOption,
        isRevealed: true,
        syncMatch: match,
        syncScore: wyrSession.syncScore,
        message: match ? 'You matched!' : 'Different choices'
      });
    }

    res.status(201).json({
      answerId: answer._id,
      chosenOption: answer.chosenOption,
      isRevealed: false,
      message: 'Answer submitted. Waiting for partner.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add reaction after reveal
exports.reactToAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.userId;
    const { reactionEmoji, discussionNote } = req.body;

    const answer = await WYRAnswer.findById(answerId);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Verify user owns this answer
    if (answer.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only react after reveal
    if (!answer.isRevealed) {
      return res.status(400).json({ error: 'Can only react after answers are revealed' });
    }

    answer.reactionEmoji = reactionEmoji || '👍';
    answer.discussionNote = discussionNote || null;
    await answer.save();

    res.json({
      answerId: answer._id,
      reactionEmoji: answer.reactionEmoji,
      discussionNote: answer.discussionNote,
      message: 'Reaction added'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
