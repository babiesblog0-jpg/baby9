const multer = require('multer');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const { s3Client, R2_BUCKET, getPublicUrl } = require('../config/r2');

// Use memory storage - files held in buffer before uploading to R2
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter,
});

/**
 * Shop products accept a cover image and a downloadable PDF in one request.
 * Declared separately from `upload` so the image-only routes keep their
 * stricter filter and 5MB cap — each field is validated for its own type here.
 */
const productFileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdf') {
    const isPdf =
      file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    return isPdf ? cb(null, true) : cb(new Error('Product file must be a PDF'));
  }
  return fileFilter(req, file, cb);
};

exports.uploadProductMedia = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // ebooks run larger than cover images
  fileFilter: productFileFilter,
}).fields([
  { name: 'image', maxCount: 8 },
  { name: 'pdf', maxCount: 1 },
]);

/**
 * Upload a file buffer to R2 and return the public URL
 */
exports.uploadToR2 = async (file, folder = 'uploads') => {
  if (!file) return null;

  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  return getPublicUrl(key);
};
