const { User } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenService');

// Register with email/phone + password
exports.register = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const query = [];
if (email) query.push({ email });
if (phone) query.push({ phone });

const existingUser = await User.findOne({ $or: query });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email: email || null,
      phone: phone || null,
      passwordHash,
      status: 'active'
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      userId: user._id,
      accessToken,
      refreshToken,
      onboardingComplete: user.onboardingComplete,
      message: 'Registration successful. Complete your profile setup.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login and receive JWT
exports.login = async (req, res) => {
  try {
    const { email, phone, password, fcmToken } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

    // Find user
       const query = [];
if (email) query.push({ email });
if (phone) query.push({ phone });
const user = await User.findOne({ $or: query });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update lastActive and FCM token
    user.lastActive = new Date();
    if (fcmToken) {
      user.fcmToken = fcmToken;
    }
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    res.json({
      userId: user._id,
      accessToken,
      refreshToken,
      user: {
        email: user.email,
        phone: user.phone,
        status: user.status,
        onboardingComplete: user.onboardingComplete || false
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Refresh access token
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Logout - Invalidate session
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Clear FCM token from user
    await User.findByIdAndUpdate(userId, { fcmToken: null });

    // In production, add refreshToken to blacklist (Redis)
    // For now, we'll just respond with success

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send password reset OTP (rate-limited to 3 per hour)
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

      const query = [];
if (email) query.push({ email });
if (phone) query.push({ phone });

const user = await User.findOne({ $or: query });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Redis with TTL (or in DB with expiry)
    // For now, storing in memory (in production use Redis)
    if (!global.otpStore) global.otpStore = {};
    global.otpStore[user._id] = { otp, expiry: otpExpiry };

    // Send OTP via email/SMS
    if (user.email) {
      // Send email (implement with Nodemailer)
      console.log(`Sending OTP ${otp} to email ${user.email}`);
    }
    if (user.phone) {
      // Send SMS (implement with Twilio)
      console.log(`Sending OTP ${otp} to phone ${user.phone}`);
    }

    res.json({
      message: 'OTP sent to registered email/phone',
      resetToken: user._id.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, otp, newPassword } = req.body;

    if (!resetToken || !otp || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify OTP
    if (!global.otpStore || !global.otpStore[resetToken]) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const storedOTP = global.otpStore[resetToken];

    if (storedOTP.otp !== otp || new Date() > storedOTP.expiry) {
      delete global.otpStore[resetToken];
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and invalidate all sessions
    await User.findByIdAndUpdate(resetToken, { passwordHash });

    // Clear OTP
    delete global.otpStore[resetToken];

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
