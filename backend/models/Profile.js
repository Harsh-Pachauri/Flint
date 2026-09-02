const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 100
  },
  bio: {
    type: String,
    maxlength: 500
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  genderPreference: {
    type: String,
    enum: ['male', 'female', 'both'],
    required: true
  },
  datingType: {
    type: String,
    enum: ['casual', 'serious', 'either', 'something_real', 'see_where_it_goes', 'campus_friends_first', 'study_partner'],
    required: true
  },
  branch: {
    type: String,
    trim: true,
    default: ''
  },
  year: {
    type: Number,
    min: 1,
    max: 10
  },
  depart: {
    type: String,
    trim: true,
    default: ''
  },
  vibewords: {
    type: [String],
    default: []
  },
  interests: {
    type: [String],
    default: []
  },
  personality: {
    introvertExtrovert: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    chillIntense: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    homebodyAdventurous: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    traits: {
      type: [String],
      default: []
    }
  },
  photos: [
    {
      url: String,
      publicId: String, // Cloudinary public ID for deletion
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  location: {
    // No `default: 'Point'` here deliberately: with a default, Mongoose
    // creates `{ type: 'Point' }` (no coordinates) for every profile that
    // doesn't supply a location, and the 2dsphere index below then rejects
    // that as an invalid partial GeoJSON value ("Point must be an array or
    // object, instead got type missing") on every save. A profile with no
    // real location should have no `location` value at all, not a broken
    // placeholder one — the app must never default this to real-looking
    // coordinates like [0, 0] either, since that's a real place on Earth.
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number],
    address: String
  },
  aiAssessmentScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

profileSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Profile', profileSchema);
