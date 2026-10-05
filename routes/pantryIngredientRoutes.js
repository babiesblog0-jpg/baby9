const express = require('express');
const {
  createPantryIngredient,
  getAllPantryIngredients,
  getPantryIngredient,
  updatePantryIngredient,
  deletePantryIngredient,
} = require('../controllers/pantryIngredientController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getAllPantryIngredients);
router.get('/:id', getPantryIngredient);

// Protected routes (admin only, same convention as Categories)
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), createPantryIngredient);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), updatePantryIngredient);
router.delete('/:id', authMiddleware, adminMiddleware, deletePantryIngredient);

module.exports = router;
