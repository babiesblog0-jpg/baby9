const express = require('express');
const {
  createFeaturedDelight,
  getAllFeaturedDelights,
  getFeaturedDelight,
  updateFeaturedDelight,
  deleteFeaturedDelight,
} = require('../controllers/featuredDelightController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllFeaturedDelights);
router.get('/:id', getFeaturedDelight);

// Protected routes (admin only)
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), createFeaturedDelight);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), updateFeaturedDelight);
router.delete('/:id', authMiddleware, adminMiddleware, deleteFeaturedDelight);

module.exports = router;
