const Banner = require('../models/Banner');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

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
      filename = await processAndStoreImage(req.file.buffer, 'banner');
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

    let oldImage = banner.image;
    let newImage = null;

    // Handle new image upload
    if (req.file) {
      newImage = await processAndStoreImage(req.file.buffer, 'banner');
      banner.image = newImage;
    }

    await banner.save();

    // After DB save succeeds, delete old image if replaced
    if (newImage && oldImage) {
      deleteImageSafe(oldImage);
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    // If DB fails but we uploaded a new image, delete the new orphaned file
    if (newImage) {
      deleteImageSafe(newImage);
    }
    next(error);
  }
};

// @desc    Delete a banner
const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    // Delete image file safely
    if (banner.image) {
      deleteImageSafe(banner.image);
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
