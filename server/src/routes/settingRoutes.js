const express = require('express');
const router = express.Router();
const { getSettings, updateAppLogo } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route to get settings
router.get('/', getSettings);

// Protected Admin route to update logo
router.put('/logo', protect, authorize('admin'), upload.single('logo'), updateAppLogo);

module.exports = router;
