const { User } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateTokens, verifyRefreshToken } = require('../utils/tokenService');

// --- Password reset OTP store -----------------------------------------
// In-memory only (matches this project's existing infrastructure — there is
// no Redis/persistent cache deployed). This is an explicit, known limitation:
// entries do not survive a restart and are not shared across multiple server
// instances. Acceptable for a single-instance deployment; would need to move
// to a shared store (Redis, a TTL-indexed Mongo collection, etc.) before
// running behind more than one backend instance.
if (!global.otpStore) global.otpStore = {};       // resetToken -> { userId, otpHash, expiry, attempts }
if (!global.otpRateLimiter) global.otpRateLimiter = {}; // identifier -> [timestamps]

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RESET_REQUESTS_PER_WINDOW = 3;

function isRateLimited(identifier) {
  const now = Date.now();
  const history = (global.otpRateLimiter[identifier] || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  global.otpRateLimiter[identifier] = history;
  return history.length >= MAX_RESET_REQUESTS_PER_WINDOW;
}

function recordResetRequest(identifier) {
  const now = Date.now();
  global.otpRateLimiter[identifier] = [...(global.otpRateLimiter[identifier] || []), now];
}

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
        role: user.role,
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

// Send password reset OTP (rate-limited to 3 per hour per identifier)
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone required' });
    }

    const identifier = (email || phone).toString().toLowerCase();
    if (isRateLimited(identifier)) {
      return res.status(429).json({ error: 'Too many reset requests. Please try again later.' });
    }
    recordResetRequest(identifier);

    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const user = await User.findOne({ $or: query });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate the OTP (the actual secret the user must enter) and a
    // separate, cryptographically random reset token that identifies this
    // pending reset attempt. Unlike the user's own _id, this token is not
    // guessable/discoverable elsewhere in the app, and by itself it is not
    // sufficient to reset a password — the matching OTP is still required.
    const otp = crypto.randomInt(100000, 999999).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

    global.otpStore[resetToken] = {
      userId: user._id.toString(),
      otpHash,
      expiry: otpExpiry,
      attempts: 0
    };

    // Send OTP via email/SMS.
    // NOTE: there is no real email/SMS delivery wired up in this project
    // (no Nodemailer/Twilio integration exists yet) — this console.log is a
    // stand-in for that delivery channel, not a production-ready notification.
    if (user.email) {
      console.log(`[password-reset] OTP ${otp} (token ${resetToken}) for email ${user.email}`);
    }
    if (user.phone) {
      console.log(`[password-reset] OTP ${otp} (token ${resetToken}) for phone ${user.phone}`);
    }

    res.json({
      message: 'If an account exists, an OTP has been sent to the registered email/phone.',
      resetToken
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

    const entry = global.otpStore[resetToken];
    if (!entry) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (new Date() > new Date(entry.expiry)) {
      delete global.otpStore[resetToken];
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (entry.attempts >= MAX_OTP_ATTEMPTS) {
      delete global.otpStore[resetToken];
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    const otpMatches = await bcrypt.compare(otp.toString(), entry.otpHash);
    if (!otpMatches) {
      entry.attempts += 1;
      if (entry.attempts >= MAX_OTP_ATTEMPTS) {
        delete global.otpStore[resetToken];
        return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.findByIdAndUpdate(entry.userId, { passwordHash });

    // Single-use: remove the entry immediately so this resetToken/OTP pair
    // can never be replayed to reset the password again.
    delete global.otpStore[resetToken];

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
