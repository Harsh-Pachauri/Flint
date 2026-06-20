const { Profile, User } = require('../models');

// Complete onboarding only when profile exists and at least one photo uploaded
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await Profile.findOne({ userId }).lean();
    if (!profile) {
      return res.status(400).json({ error: 'Profile not found' });
    }

    if (!Array.isArray(profile.photos) || profile.photos.length === 0) {
      return res.status(400).json({ error: 'At least one profile photo required to complete onboarding' });
    }

    await User.findByIdAndUpdate(userId, { onboardingComplete: true });

    res.json({ success: true, message: 'Onboarding completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
