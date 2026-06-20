const { Profile, User, College } = require('../models');
const { uploadFile, deleteFile } = require('../utils/uploadService');

// Create profile after registration
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      age,
      gender,
      genderPreference,
      datingType,
      interests,
      personality,
      year,
      depart,
      vibewords
    } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !genderPreference || !datingType) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ userId });
    if (existingProfile) {
      return res.status(409).json({ error: 'Profile already exists for this user' });
    }

    // Validate age
    const ageNum = Number(age);
    if (ageNum < 18 || ageNum > 100) {
      return res.status(400).json({ error: 'Age must be between 18 and 100' });
    }
    const normalizedInterests = Array.isArray(interests) ? interests : [];

    if (normalizedInterests.length < 5 || normalizedInterests.length > 20) {
      return res.status(400).json({
        error: 'Interests must include between 5 and 20 items'
      });
    }

    // Normalize personality safely with clamping
    const clampValue = value => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));

    const normalizedPersonality = personality && typeof personality === 'object' ? {
      introvertExtrovert: clampValue(personality.introvertExtrovert),
      chillIntense: clampValue(personality.chillIntense),
      homebodyAdventurous: clampValue(personality.homebodyAdventurous),
      traits: Array.isArray(personality.traits) ? personality.traits : []
    } : {
      introvertExtrovert: 50,
      chillIntense: 50,
      homebodyAdventurous: 50,
      traits: []
    };

    // Create profile with clean data
    const profile = new Profile({
      userId,
      name,
      age: ageNum,
      gender,
      genderPreference,
      datingType,
      interests,
      personality: normalizedPersonality,
      year: year ? Number(year) : null,
      depart: depart || '',
      vibewords: Array.isArray(vibewords) ? vibewords : [],
      location: {
        type: 'Point',
        coordinates: [0, 0]
      },
      photos: []
    });

    await profile.save();

    res.status(201).json({
      profileId: profile._id,
      message: 'Profile created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get own profile
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await Profile.findOne({ userId })
      .populate('collegeId')
      .populate('userId', 'email phone');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      profile,
      aiAssessmentScore: profile.aiAssessmentScore
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update own profile
exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      bio,
      location,
      genderPreference,
      datingType,
      photos,
      interests,
      personality,
      personalityTraits,
      year,
      depart,
      vibewords
    } = req.body;

    const updateData = {};
    const clampValue = value => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));

    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (genderPreference !== undefined) updateData.genderPreference = genderPreference;
    if (datingType !== undefined) updateData.datingType = datingType;
    if (photos !== undefined) updateData.photos = photos;
    if (interests !== undefined) {
      if (!Array.isArray(interests) || interests.length < 1 || interests.length > 20) {
        return res.status(400).json({ error: 'Interests must include between 1 and 20 items' });
      }
      updateData.interests = interests;
    }
    if (personality !== undefined) {
      if (typeof personality !== 'object' || personality === null) {
        return res.status(400).json({ error: 'Personality must be an object' });
      }
      updateData.personality = {
        introvertExtrovert: clampValue(personality.introvertExtrovert),
        chillIntense: clampValue(personality.chillIntense),
        homebodyAdventurous: clampValue(personality.homebodyAdventurous),
        traits: Array.isArray(personality.traits) ? personality.traits : []
      };
    } else if (personalityTraits !== undefined) {
      if (!Array.isArray(personalityTraits)) {
        return res.status(400).json({ error: 'personalityTraits must be an array' });
      }
      updateData['personality.traits'] = personalityTraits;
    }
    if (year !== undefined) updateData.year = year;
    if (depart !== undefined) updateData.depart = depart;
    if (vibewords !== undefined) updateData.vibewords = Array.isArray(vibewords) ? vibewords : updateData.vibewords;
    updateData.updatedAt = new Date();

    const profile = await Profile.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    ).populate('collegeId');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Submit AI assessment quiz answers
exports.submitAIAssessment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    // Call AI service to compute score (mock implementation)
    const score = computeAIScore(answers);

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { aiAssessmentScore: score },
      { new: true }
    );

    res.json({
      profile,
      aiAssessmentScore: score,
      message: 'AI assessment completed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to compute AI score (mock)
function computeAIScore(answers) {
  // In production, call actual AI service
  return Math.random() * 100;
}

// View another user's profile
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await Profile.findOne({ userId: userId })
      .populate('collegeId', 'name city')
      .select('name age gender bio photos aiAssessmentScore location year depart vibewords -_id');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Return only public fields
    res.json({
      profile: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        bio: profile.bio,
        photos: profile.photos,
        aiAssessmentScore: profile.aiAssessmentScore,
        college: profile.collegeId
        // Note: Exact location not returned to public view
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload profile photos (multipart upload to Cloudinary or local storage)
exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Max 6 photos
    const profile = await Profile.findOne({ userId });
    if (profile.photos.length + req.files.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 photos allowed' });
    }

    const uploadedUrls = [];

    // Upload each file
    for (const file of req.files) {
      const result = await uploadFile(file, userId, 'profiles');

      if (result.success) {
        uploadedUrls.push({
          url: result.url,
          publicId: result.publicId || null, // Cloudinary public ID
          uploadedAt: new Date()
        });
      } else {
        return res.status(500).json({ error: `Upload failed: ${result.error}` });
      }
    }

    // If profile had no photos before, make sure the newly uploaded photos become the primary (first) photos
    const hadNoPhotos = !profile.photos || profile.photos.length === 0;
    if (hadNoPhotos) {
      profile.photos = uploadedUrls.concat(profile.photos || []);
    } else {
      profile.photos.push(...uploadedUrls);
    }

    await profile.save();

    res.json({
      uploadedUrls,
      totalPhotos: profile.photos.length,
      avatarUrl: profile.photos[0] ? profile.photos[0].url : null,
      message: 'Photos uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a profile photo
exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { photoId } = req.params;

    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Find and remove photo
    const photoIndex = profile.photos.findIndex(p => p._id.toString() === photoId);

    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = profile.photos[photoIndex];

    // Delete from Cloudinary or local storage
    await deleteFile(photo.url, photo.publicId);

    // Remove from array
    profile.photos.splice(photoIndex, 1);
    await profile.save();

    res.json({
      message: 'Photo deleted successfully',
      totalPhotos: profile.photos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
