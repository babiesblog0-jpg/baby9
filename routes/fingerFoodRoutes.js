const express = require('express');
const {
  createFingerFood,
  getAllFingerFoods,
  getFingerFood,
  updateFingerFood,
  deleteFingerFood,
} = require('../controllers/fingerFoodController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllFingerFoods);
router.get('/:id', getFingerFood);

// Protected routes (admin only)
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), createFingerFood);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), updateFingerFood);
router.delete('/:id', authMiddleware, adminMiddleware, deleteFingerFood);

module.exports = router;
