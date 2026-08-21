const AppSetting = require('../models/AppSetting');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// @desc    Get all settings (Public)
const getSettings = async (req, res, next) => {
  try {
    const PUBLIC_KEYS = [
      'appName', 'appLogo', 'salonSearchRadius', 
      'supportEmail', 'supportPhone', 'supportWhatsApp', 'supportHours', 'supportDescription',
      'loginPageImage', 'registerPageImage'
    ];
    
    const settings = await AppSetting.find({ key: { $in: PUBLIC_KEYS } });
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Update app logo (Admin)
const updateAppLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const newImage = await processAndStoreImage(req.file.buffer, 'logo');

    // Find existing app logo to potentially delete the old file
    const existingLogo = await AppSetting.findOne({ key: 'appLogo' });
    const oldImage = existingLogo ? existingLogo.value : null;

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'appLogo' },
      { value: newImage },
      { new: true, upsert: true }
    );

    // After DB save succeeds, delete old image if replaced
    if (oldImage) {
      deleteImageSafe(oldImage);
    }

    res.json({ success: true, data: updatedSetting });
  } catch (error) {
    if (req.file && error) {
      // Error handling for image upload failure
    }
    next(error);
  }
};

// @desc    Update Login Page Image (Admin)
const updateLoginImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image file' });
    const newImage = await processAndStoreImage(req.file.buffer, 'loginPage');
    const existingImage = await AppSetting.findOne({ key: 'loginPageImage' });
    const oldImage = existingImage ? existingImage.value : null;

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'loginPageImage' },
      { value: newImage },
      { new: true, upsert: true }
    );
    if (oldImage) deleteImageSafe(oldImage);
    res.json({ success: true, data: updatedSetting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Register Page Image (Admin)
const updateRegisterImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image file' });
    const newImage = await processAndStoreImage(req.file.buffer, 'registerPage');
    const existingImage = await AppSetting.findOne({ key: 'registerPageImage' });
    const oldImage = existingImage ? existingImage.value : null;

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'registerPageImage' },
      { value: newImage },
      { new: true, upsert: true }
    );
    if (oldImage) deleteImageSafe(oldImage);
    res.json({ success: true, data: updatedSetting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update app name (Admin)
const updateAppName = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide an application name' });
    }

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'appName' },
      { value: name },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: updatedSetting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update salon search radius (Admin)
const updateSalonSearchRadius = async (req, res, next) => {
  try {
    const { radius } = req.body;
    
    if (radius === undefined || radius === null || isNaN(radius) || Number(radius) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid radius greater than 0' });
    }

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'salonSearchRadius' },
      { value: String(radius) },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: updatedSetting });
  } catch (error) {
    next(error);
  }
};

// @desc    Update multiple settings at once (Admin)
// @route   PUT /api/settings/bulk
// @access  Private (Admin)
const updateBulkSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }

    const bulkOps = Object.keys(settings).map((key) => ({
      updateOne: {
        filter: { key },
        update: { value: settings[key] },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await AppSetting.bulkWrite(bulkOps);
    }

    // Fetch and return the updated settings
    const updatedSettings = await AppSetting.find({});
    const settingsObj = {};
    updatedSettings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateAppLogo,
  updateAppName,
  updateSalonSearchRadius,
  updateBulkSettings,
  updateLoginImage,
  updateRegisterImage
};
