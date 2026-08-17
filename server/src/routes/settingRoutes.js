const express = require('express');
const router = express.Router();
const { getSettings, updateAppLogo, updateAppName } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route to get settings
router.get('/', getSettings);

// Protected Admin route to update logo
router.put('/logo', protect, authorize('admin'), upload.single('logo'), updateAppLogo);

// Protected Admin route to update app name
router.put('/name', protect, authorize('admin'), updateAppName);

module.exports = router;
