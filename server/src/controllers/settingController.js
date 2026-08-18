const AppSetting = require('../models/AppSetting');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// @desc    Get all settings (Public)
const getSettings = async (req, res, next) => {
  try {
    const settings = await AppSetting.find({});
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
      // If we could access the generated filename, we'd delete it, but processAndStoreImage might have thrown.
      // Better to return the error safely.
    }
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

module.exports = {
  getSettings,
  updateAppLogo,
  updateAppName,
  updateSalonSearchRadius,
};
