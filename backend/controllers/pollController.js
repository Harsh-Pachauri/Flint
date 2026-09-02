const { Poll } = require('../models');

exports.createPoll = async (req, res) => {
  try {
    const { question, options } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'At least two options are required' });
    }

    const normalizedOptions = options
      .map((option) => (typeof option === 'string' ? option.trim() : ''))
      .filter(Boolean);

    if (normalizedOptions.length < 2) {
      return res.status(400).json({ error: 'At least two valid options are required' });
    }

    const poll = new Poll({
      creator: req.user.userId,
      question: question.trim(),
      options: normalizedOptions.map((option) => ({ text: option }))
    });

    await poll.save();

    res.status(201).json({ success: true, poll });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPolls = async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, polls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.pollId);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.voters.some((id) => id.toString() === req.user.userId)) {
      return res.status(400).json({ error: 'You have already voted in this poll' });
    }

    const index = parseInt(optionIndex, 10);
    if (Number.isNaN(index) || index < 0 || index >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    poll.options[index].votes += 1;
    poll.voters.push(req.user.userId);
    await poll.save();

    res.json({ success: true, poll });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPollResults = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId).lean();
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const totalVotes = poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
    const results = poll.options.map((option) => ({
      option: option.text,
      votes: option.votes || 0,
      percentage: totalVotes ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0
    }));

    res.json({ success: true, totalVotes, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
