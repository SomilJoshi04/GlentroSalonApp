const AppSetting = require('../models/AppSetting');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

    const filename = `app-logo-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    
    await sharp(req.file.buffer)
      .webp({ quality: 90 })
      .toFile(path.join(uploadsDir, filename));

    // Find existing app logo to potentially delete the old file
    const existingLogo = await AppSetting.findOne({ key: 'appLogo' });
    if (existingLogo && existingLogo.value) {
      // Optional: Delete old image
      const oldPath = path.join(uploadsDir, existingLogo.value);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const updatedSetting = await AppSetting.findOneAndUpdate(
      { key: 'appLogo' },
      { value: filename },
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
};
