// utils/uploadService.js
const fs = require('fs');
const path = require('path');
const { cloudinary, testCloudinaryConnection } = require('../config/cloudinary');

let useCloudinary = false;

// Initialize Cloudinary usage
const initUploadService = async () => {
  useCloudinary = await testCloudinaryConnection();
};

// Upload to Cloudinary
const uploadToCloudinary = async (file, folder, userId) => {
  if (!file || !file.buffer) {
    return { success: false, error: 'Uploaded file buffer is missing' };
  }

  try {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `MEGA_SERVER/${folder}/${userId}`,
          resource_type: 'image',
          public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id
            });
          }
        }
      );

      stream.end(file.buffer);
    });
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload to local storage
const uploadToLocal = async (file, userId, folder) => {
  try {
    const uploadDir = path.join(__dirname, '../uploads', folder, userId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filepath, file.buffer);

    // Return accessible URL (relative path)
    const url = `/uploads/${folder}/${userId}/${filename}`;

    return {
      success: true,
      url,
      filePath: filepath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Main upload function - always uses Cloudinary storage
const uploadFile = async (file, userId, folder = 'general') => {
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  if (!useCloudinary) {
    return { success: false, error: 'Cloudinary is not configured or available' };
  }

  return uploadToCloudinary(file, folder, userId);
};

// Upload multiple files
const uploadMultipleFiles = async (files, userId, folder = 'general') => {
  if (!files || files.length === 0) {
    return { success: false, error: 'No files provided' };
  }

  const results = [];

  for (const file of files) {
    const result = await uploadFile(file, userId, folder);
    results.push(result);
  }

  return {
    success: results.every(r => r.success),
    uploads: results
  };
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Delete file from local storage
const deleteFromLocal = async (url) => {
  try {
    const filepath = path.join(__dirname, '..', url);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return { success: true };
    } else {
      return { success: false, error: 'File not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Main delete function
const deleteFile = async (fileUrl, cloudinaryId = null) => {
  if (useCloudinary && cloudinaryId) {
    return deleteFromCloudinary(cloudinaryId);
  } else if (fileUrl.startsWith('http')) {
    // If it's a Cloudinary URL but no ID provided, skip deletion
    return { success: true };
  } else {
    return deleteFromLocal(fileUrl);
  }
};

module.exports = {
  initUploadService,
  uploadFile,
  uploadMultipleFiles,
  deleteFile,
  useCloudinary: () => useCloudinary
};
