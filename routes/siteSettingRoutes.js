const express = require('express');
const { getSetting, updateSetting } = require('../controllers/siteSettingController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public route
router.get('/:key', getSetting);

// Protected route (admin only)
router.put('/:key', authMiddleware, adminMiddleware, updateSetting);

module.exports = router;
