const Banner = require('../models/Banner');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// @desc    Get active banners (Public)
const getActiveBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all banners (Admin)
const getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a banner
const createBanner = async (req, res, next) => {
  try {
    const { title, link } = req.body;
    let filename = '';

    if (req.file) {
      filename = `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(path.join(uploadsDir, filename));
    } else {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const banner = await Banner.create({
      title,
      link,
      image: filename,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a banner
const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    const { title, link, isActive } = req.body;
    
    // Update basic fields
    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;
    if (isActive !== undefined) banner.isActive = isActive;

    // Handle new image upload
    if (req.file) {
      // Optional: Delete old image
      if (banner.image) {
        const oldPath = path.join(uploadsDir, banner.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const filename = `banner-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(path.join(uploadsDir, filename));
      banner.image = filename;
    }

    await banner.save();
    res.json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a banner
const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    // Delete image file
    if (banner.image) {
      const filePath = path.join(uploadsDir, banner.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await banner.deleteOne();
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle banner status
const toggleBannerStatus = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();
    res.json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveBanners,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
};
