// config/cloudinary.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log(`✓ Cloudinary Connected: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    return true;
  } catch (error) {
    console.warn(`⚠ Cloudinary Connection Warning: ${error.message}`);
    console.log('  → File uploads will be disabled. Configure Cloudinary in .env');
    return false;
  }
};

module.exports = { cloudinary, testCloudinaryConnection };
