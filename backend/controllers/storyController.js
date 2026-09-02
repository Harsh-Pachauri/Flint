const { StorySession, StoryEntry, StoryExport, PlayroomSession, PlayroomScore, Playroom, Match } = require('../models');
const puppeteer = require('puppeteer');
const { uploadFile } = require('../utils/uploadService');

// Get story session state
exports.getStorySession = async (req, res) => {
  try {
    const { storySessionId } = req.params;

    const storySession = await StorySession.findById(storySessionId);

    if (!storySession) {
      return res.status(404).json({ error: 'Story session not found' });
    }

    // Get all story entries ordered by position
    const entries = await StoryEntry.find({ storySessionId })
      .populate('userId', 'name')
      .sort({ position: 1 });

    res.json({
      storySessionId: storySession._id,
      vibe: storySession.vibe,
      maxSentences: storySession.maxSentences,
      currentPosition: storySession.currentPosition,
      currentTurnUserId: storySession.currentTurnUserId,
      stalledCount: storySession.stalledCount,
      status: storySession.status,
      entries: entries.map(e => ({
        entryId: e._id,
        userId: e.userId._id,
        userName: e.userId.name,
        text: e.text,
        position: e.position,
        aiGenerated: e.aiGenerated,
        nudgeReason: e.nudgeReason,
        likedByPartner: e.likedByPartner,
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a sentence to the story
exports.addEntry = async (req, res) => {
  try {
    const { storySessionId } = req.params;
    const userId = req.user.userId;
    const { text } = req.body;

    if (!text || text.length < 5) {
      return res.status(400).json({ error: 'Entry must be at least 5 characters' });
    }

    const storySession = await StorySession.findById(storySessionId);

    if (!storySession) {
      return res.status(404).json({ error: 'Story session not found' });
    }

    // Verify it's calling user's turn
    if (storySession.currentTurnUserId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'It is not your turn' });
    }

    // Verify game is still active
    if (storySession.status !== 'active') {
      return res.status(400).json({ error: 'Story session is not active' });
    }

    const nextPosition = storySession.currentPosition + 1;

    // Create entry
    const entry = new StoryEntry({
      storySessionId,
      userId,
      text,
      position: nextPosition,
      aiGenerated: false,
      createdAt: new Date()
    });

    await entry.save();

    // Update session
    storySession.currentPosition = nextPosition;
    storySession.stalledCount = 0; // Reset stalled count

    // Increment story score for this user
    const playSession = await PlayroomSession.findById(storySession.sessionId);
    if (playSession) {
      let score = await PlayroomScore.findOne({
        playroomId: playSession.playroomId,
        userId
      });
      if (!score) {
        score = new PlayroomScore({
          playroomId: playSession.playroomId,
          userId,
          storyEntries: 1
        });
      } else {
        score.storyEntries += 1;
      }
      await score.save();
    }

    // Flip turn to other user
    if (playSession) {
      const playroom = await Playroom.findById(playSession.playroomId);
      if (playroom) {
        const match = await Match.findById(playroom.matchId);
        if (match) {
          const otherUserId = match.userIds
            .map(u => u.toString())
            .find(id => id !== userId.toString());
          if (otherUserId) {
            storySession.currentTurnUserId = otherUserId;
          }
        }
      }
    }

    // Check if story is complete
    if (nextPosition >= storySession.maxSentences) {
      storySession.status = 'completed';
    }

    await storySession.save();

    res.status(201).json({
      entryId: entry._id,
      position: nextPosition,
      message: nextPosition >= storySession.maxSentences ? 'Story completed!' : 'Entry added'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Like partner's sentence
exports.likeEntry = async (req, res) => {
  try {
    const { storySessionId, entryId } = req.params;
    const userId = req.user.userId;

    const entry = await StoryEntry.findById(entryId);

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.storySessionId.toString() !== storySessionId) {
      return res.status(400).json({ error: 'Entry does not belong to this story' });
    }

    // Can't like your own entry
    if (entry.userId.toString() === userId.toString()) {
      return res.status(400).json({ error: 'Cannot like your own entry' });
    }

    // Toggle like
    entry.likedByPartner = !entry.likedByPartner;
    await entry.save();

    // Emit WebSocket event for live heart animation
    // io.to(`story:${storySessionId}`).emit('entry:liked', { entryId, liked: entry.likedByPartner });

    res.json({
      entryId: entry._id,
      liked: entry.likedByPartner,
      message: entry.likedByPartner ? 'Entry liked' : 'Like removed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export story as card image
exports.exportStory = async (req, res) => {
  try {
    const { storySessionId } = req.params;
    const userId = req.user.userId;

    const storySession = await StorySession.findById(storySessionId);

    if (!storySession) {
      return res.status(404).json({ error: 'Story session not found' });
    }

    // Get all entries
    const entries = await StoryEntry.find({ storySessionId })
      .sort({ position: 1 })
      .select('text');

    const fullText = entries.map(e => e.text).join(' ');

    // Generate card image using Puppeteer
    let cardImageUrl = null;

    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Create HTML for card
      const html = `
        <html>
          <body style="width: 600px; height: 600px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: Arial; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: white;">
              <h1>Our Story</h1>
              <p style="font-size: 14px; line-height: 1.6; max-height: 350px; overflow-y: auto;">
                ${fullText}
              </p>
              <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">Shared on ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `;

      await page.setContent(html);
      const screenshot = await page.screenshot({ encoding: 'binary' });
      await browser.close();

      // Upload to Cloudinary
      const screenshotBuffer = Buffer.from(screenshot);
      const file = {
        buffer: screenshotBuffer,
        originalname: `story-${storySessionId}-${Date.now()}.png`,
        mimetype: 'image/png'
      };

      const uploadResult = await uploadFile(file, userId, 'stories');
      if (uploadResult.success) {
        cardImageUrl = uploadResult.url;
      }
    } catch (error) {
      console.error('Error generating card image:', error);
      // Continue without image on error
    }

    // Create export record
    const storyExport = new StoryExport({
      storySessionId,
      fullText,
      cardImageUrl: cardImageUrl || null,
      isShared: false,
      exportedAt: new Date()
    });

    await storyExport.save();

    res.json({
      storyExportId: storyExport._id,
      fullText,
      cardImageUrl,
      message: 'Story exported successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
