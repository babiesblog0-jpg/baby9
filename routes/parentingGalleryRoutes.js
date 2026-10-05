const express = require('express');
const {
  createGalleryItem,
  getAllGalleryItems,
  getGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} = require('../controllers/parentingGalleryController');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllGalleryItems);
router.get('/:id', getGalleryItem);

// Protected routes
router.post('/', authMiddleware, upload.single('image'), createGalleryItem);
router.put('/:id', authMiddleware, upload.single('image'), updateGalleryItem);
router.delete('/:id', authMiddleware, deleteGalleryItem);

module.exports = router;
