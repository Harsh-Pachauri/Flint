// utils/tokenService.js
//
// Single source of truth for JWT secrets and signing/verification. Every
// other module (authMiddleware, Socket.io handshake auth) must go through
// this file rather than reading process.env.JWT_SECRET directly, so token
// generation and verification can never drift out of sync with each other.
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';

const DEV_FALLBACK_JWT_SECRET = 'dev_only_insecure_jwt_secret_do_not_use_in_production';
const DEV_FALLBACK_REFRESH_SECRET = 'dev_only_insecure_refresh_secret_do_not_use_in_production';

if (isProduction && (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET)) {
  // Fail loudly and immediately at startup rather than silently signing
  // production tokens with a well-known, hardcoded fallback secret.
  throw new Error(
    'JWT_SECRET and REFRESH_TOKEN_SECRET must both be set in production. ' +
    'Refusing to start with an insecure fallback secret.'
  );
}

const getJwtSecret = () => process.env.JWT_SECRET || DEV_FALLBACK_JWT_SECRET;
const getRefreshSecret = () => process.env.REFRESH_TOKEN_SECRET || DEV_FALLBACK_REFRESH_SECRET;

// Generate access token (15 minutes)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: '15m' }
  );
};

// Generate refresh token (7 days)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
};

// Generate both tokens
const generateTokens = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};

// Verify access token (used internally where a null-on-failure result is convenient)
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, getRefreshSecret());
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  getJwtSecret,
  getRefreshSecret
};
