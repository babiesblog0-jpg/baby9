const express = require('express');
const {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductOrderCounts,
} = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadProductMedia } = require('../middleware/upload');

const router = express.Router();

// Admin only; registered before '/:id' so it isn't read as a product id.
router.get('/order-counts', authMiddleware, adminMiddleware, getProductOrderCounts);

// Public routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Protected routes (admin only)
router.post('/', authMiddleware, adminMiddleware, uploadProductMedia, createProduct);
router.put('/:id', authMiddleware, adminMiddleware, uploadProductMedia, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

module.exports = router;
