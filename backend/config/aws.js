// config/aws.js
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Test S3 connection
const testS3Connection = async () => {
  try {
    await s3.headBucket({ Bucket: process.env.AWS_BUCKET_NAME }).promise();
    console.log(`✓ AWS S3 Connected: ${process.env.AWS_BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.warn(`⚠ AWS S3 Connection Warning: ${error.message}`);
    console.log('  → Photo uploads will be disabled. Use local storage instead.');
    return false;
  }
};

module.exports = { s3, testS3Connection };
