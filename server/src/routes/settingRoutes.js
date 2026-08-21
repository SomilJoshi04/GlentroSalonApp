const express = require('express');
const router = express.Router();
const { getSettings, updateAppLogo, updateAppName, updateSalonSearchRadius, updateBulkSettings, updateLoginImage, updateRegisterImage } = require('../controllers/settingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route to get settings
router.get('/', getSettings);

// Protected Admin route to update logo
router.put('/logo', protect, authorize('admin'), upload.single('logo'), updateAppLogo);

// Protected Admin route to update app name
router.put('/name', protect, authorize('admin'), updateAppName);

// Protected Admin route to update salon search radius
router.put('/search-radius', protect, authorize('admin'), updateSalonSearchRadius);

// Protected Admin route to update multiple settings in bulk
router.put('/bulk', protect, authorize('admin'), updateBulkSettings);

// Protected Admin route to update login page image
router.put('/login-image', protect, authorize('admin'), upload.single('image'), updateLoginImage);

// Protected Admin route to update register page image
router.put('/register-image', protect, authorize('admin'), upload.single('image'), updateRegisterImage);

module.exports = router;
