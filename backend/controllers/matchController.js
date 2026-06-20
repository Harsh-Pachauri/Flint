const { Match, CompatibilityTest, Message, Profile, Notification } = require('../models');

async function loadProfileMap(userIds) {
  const profiles = await Profile.find({ userId: { $in: userIds } })
    .select('userId name photos lastActive')
    .lean();

  return new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
}

// List all matches
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user.userId;

    const matches = await Match.find({
      userIds: userId,
      status: 'active'
    })
      .populate({
        path: 'userIds',
        select: 'lastActive'
      })
      .sort({ matchedAt: -1 });

    const profileMap = await loadProfileMap(matches.flatMap((match) => match.userIds.map((user) => user._id)));

    res.json({
      matches: matches.map(m => ({
        matchId: m._id,
        otherUser: (() => {
          const otherUser = m.userIds.find(u => u._id.toString() !== userId);
          const profile = otherUser ? profileMap.get(otherUser._id.toString()) : null;
          return {
            _id: otherUser?._id,
            name: profile?.name || 'Match',
            photos: profile?.photos || [],
            lastActive: profile?.lastActive || otherUser?.lastActive || null
          };
        })(),
        matchedAt: m.matchedAt,
        status: m.status
      })),
      count: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single match detail
exports.getMatchDetail = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;

    const match = await Match.findById(matchId).populate('userIds', 'lastActive');

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is part of this match
    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const profileMap = await loadProfileMap(match.userIds.map((user) => user._id));
    const otherUserId = match.userIds.find(u => u._id.toString() !== userId);
    const otherUserProfile = otherUserId ? profileMap.get(otherUserId._id.toString()) : null;

    // Get compatibility test status
    const compatTest = await CompatibilityTest.findOne({ matchId });

    // Get last message preview
    const lastMessage = await Message.findOne({ matchId })
      .sort({ sentAt: -1 })
      .select('content sentAt');

    // Get playroom status
    const Playroom = require('../models').Playroom;
    const playroom = await Playroom.findOne({ matchId }).select('isActive');

    res.json({
      matchId: match._id,
      otherUser: {
        _id: otherUserId?._id,
        name: otherUserProfile?.name || 'Match',
        photos: otherUserProfile?.photos || [],
        lastActive: otherUserProfile?.lastActive || otherUserId?.lastActive || null
      },
      matchedAt: match.matchedAt,
      compatibilityTest: compatTest ? {
        completed: compatTest.completed,
        score: compatTest.compatibilityScore
      } : null,
      lastMessage: lastMessage || null,
      playroomActive: playroom?.isActive || false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit compatibility test
exports.submitCompatibilityTest = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is part of match
    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Compute compatibility score (mock)
    const compatibilityScore = Math.random() * 100;

    // Create or update compatibility test
    let compatTest = await CompatibilityTest.findOne({ matchId });

    if (!compatTest) {
      compatTest = new CompatibilityTest({
        matchId,
        answers,
        compatibilityScore,
        completed: true,
        completedAt: new Date()
      });
    } else {
      compatTest.answers = answers;
      compatTest.compatibilityScore = compatibilityScore;
      compatTest.completed = true;
      compatTest.completedAt = new Date();
    }

    await compatTest.save();

    res.json({
      compatibilityScore,
      completed: true,
      message: 'Compatibility test submitted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get chat messages - cursor-based pagination
exports.getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.userId;
    const { before, limit = 30 } = req.query;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.userIds.some(u => u._id.toString() === userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let query = { matchId };

    // Cursor-based pagination
    if (before) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.sentAt = { $lt: beforeMessage.sentAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'name')
      .sort({ sentAt: -1 })
      .limit(parseInt(limit) + 1)
      .select('_id content mediaUrl senderId sentAt');

    // Check if there are more messages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop();
    }

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      messages,
      hasMore,
      cursor: messages.length > 0 ? messages[0]._id : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Chat WebSocket (handled in socket.io setup)
// This is a placeholder for WS implementation
exports.initializeChatSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('join:chat', (matchId) => {
      socket.join(`chat:${matchId}`);
    });

    socket.on('message:send', async (data) => {
      try {
        const { matchId, content, mediaUrl } = data;
        const userId = socket.userId; // Set by auth middleware

        // Check if compatibility test completed
        const compatTest = await CompatibilityTest.findOne({ matchId });
        if (!compatTest || !compatTest.completed) {
          socket.emit('error', { message: 'Compatibility test not completed' });
          return;
        }

        const message = new Message({
          matchId,
          senderId: userId,
          content,
          mediaUrl: mediaUrl || null,
          sentAt: new Date()
        });

        await message.save();

        io.to(`chat:${matchId}`).emit('message:received', {
          messageId: message._id,
          senderId: message.senderId,
          content: message.content,
          sentAt: message.sentAt
        });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('message:read', (data) => {
      const { matchId } = data;
      io.to(`chat:${matchId}`).emit('message:marked-read');
    });
  });
};

// Unmatch
exports.unmatch = async (req, res) => {
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

    // Soft delete - preserve history
    match.status = 'archived';
    await match.save();

    // Send notification to other user
    const otherUserId = match.userIds.find(u => u._id.toString() !== userId);

    const notification = new Notification({
      userId: otherUserId,
      type: 'match',
      title: 'Match Unmatched',
      body: 'The other person has unmatched you',
      read: false
    });

    await notification.save();

    res.json({
      message: 'Unmatched successfully',
      matchId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
