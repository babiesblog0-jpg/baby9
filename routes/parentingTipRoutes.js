const express = require('express');
const {
  createParentingTip,
  getAllParentingTips,
  getParentingTip,
  updateParentingTip,
  deleteParentingTip,
} = require('../controllers/parentingTipController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllParentingTips);
router.get('/:id', getParentingTip);

// Protected routes
router.post('/', authMiddleware, upload.single('featuredImage'), createParentingTip);
router.put('/:id', authMiddleware, upload.single('featuredImage'), updateParentingTip);
router.delete('/:id', authMiddleware, deleteParentingTip);

module.exports = router;
