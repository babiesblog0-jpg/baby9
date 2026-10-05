const express = require('express');
const {
  createBlog,
  getAllBlogs,
  getBlog,
  updateBlog,
  deleteBlog,
} = require('../controllers/blogController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlog);

// Protected routes
router.post('/', authMiddleware, upload.single('featuredImage'), createBlog);
router.put('/:id', authMiddleware, upload.single('featuredImage'), updateBlog);
router.delete('/:id', authMiddleware, deleteBlog);

module.exports = router;
