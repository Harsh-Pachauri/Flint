// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.keys(err.errors).map(key => ({
        field: key,
        message: err.errors[key].message
      }))
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Multer upload errors (file too large, too many files, etc.) are client
  // input problems, not server failures — map them to 400 instead of 500.
  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'File is too large',
      LIMIT_FILE_COUNT: 'Too many files',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field'
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }

  // Malformed ObjectId passed straight into a Mongoose query
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ error: 'Invalid id' });
  }

  // Generic error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
