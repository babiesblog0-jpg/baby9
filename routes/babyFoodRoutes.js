const express = require('express');
const {
  createBabyFood,
  getAllBabyFoods,
  getBabyFood,
  updateBabyFood,
  deleteBabyFood,
} = require('../controllers/babyFoodController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllBabyFoods);
router.get('/:id', getBabyFood);

// Protected routes
router.post('/', authMiddleware, upload.single('image'), createBabyFood);
router.put('/:id', authMiddleware, upload.single('image'), updateBabyFood);
router.delete('/:id', authMiddleware, deleteBabyFood);

module.exports = router;
