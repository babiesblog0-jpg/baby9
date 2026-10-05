const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'fiverproject';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * Get the public URL for a file stored in R2.
 * If R2_PUBLIC_URL is set, use it. Otherwise, construct from the endpoint.
 */
const getPublicUrl = (key) => {
  return `/api/images/${key}`;
};

/**
 * Delete a file from R2 by its key
 */
const deleteFromR2 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    console.log(`Deleted from R2: ${key}`);
  } catch (error) {
    console.error(`Error deleting from R2: ${error.message}`);
  }
};

/**
 * Extract R2 key from a full URL
 */
const getKeyFromUrl = (url) => {
  if (!url) return null;
  
  // If it's a relative path (old local upload), return null
  if (url.startsWith('/uploads/')) return null;

  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.replace(/^\//, '');
  } catch {
    // If it's already just a key
    return url;
  }
};

module.exports = {
  s3Client,
  R2_BUCKET,
  R2_PUBLIC_URL,
  getPublicUrl,
  deleteFromR2,
  getKeyFromUrl,
};
