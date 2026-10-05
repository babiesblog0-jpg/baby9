const express = require('express');
const { generateRecipe } = require('../controllers/aiMixerController');

const router = express.Router();

// Public — the mixer page has no login/session concept
router.post('/recipe', generateRecipe);

module.exports = router;
