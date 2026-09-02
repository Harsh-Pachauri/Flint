// config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadPhotoFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPEG, PNG, and WebP images are allowed');
    err.status = 400; // picked up by errorHandler's generic branch (err.status || 500)
    cb(err, false);
  }
};

// Multer configuration for photo uploads using memory storage, required for Cloudinary uploads
const uploadPhotos = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: uploadPhotoFilter
});

// Multer configuration for general file uploads
const uploadFiles = multer({
  storage: multer.memoryStorage(), // Store in memory for Cloudinary upload
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

module.exports = {
  uploadPhotos,
  uploadFiles,
  uploadDir
};
