const Banner = require('../models/Banner');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');
const { processAndStoreVideo, deleteVideoSafe } = require('../services/videoService');

// @desc    Get active banners (Public)
const getActiveBanners = async (req, res, next) => {
  try {
    const now = new Date();
    
    // Query banners that are active and fit the current date schedule (if scheduled)
    const query = {
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
      ]
    };

    const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all banners (Admin)
const getBanners = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    let query = {};
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Banner.countDocuments(query);
      const banners = await Banner.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      return res.json({
        success: true,
        data: {
          banners,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    const banners = await Banner.find(query).sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a banner
const createBanner = async (req, res, next) => {
  try {
    const { title, link, type, description, ctaText, displayOrder, startDate, endDate } = req.body;
    
    let imageFilename = '';
    let videoFilename = '';

    // Handle files upload fields
    const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
    const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;

    if (type === 'video') {
      if (!videoFile) {
        return res.status(400).json({ success: false, message: 'Please upload a video file for video banners' });
      }
      videoFilename = await processAndStoreVideo(videoFile.buffer, videoFile.mimetype, 'banner-video');
      
      // Optional poster image
      if (imageFile) {
        imageFilename = await processAndStoreImage(imageFile.buffer, 'banner');
      }
    } else {
      // type === 'image'
      if (!imageFile) {
        return res.status(400).json({ success: false, message: 'Please upload an image file for image banners' });
      }
      imageFilename = await processAndStoreImage(imageFile.buffer, 'banner');
    }

    const banner = await Banner.create({
      title,
      link,
      type: type || 'image',
      image: imageFilename,
      video: videoFilename,
      description: description || '',
      ctaText: ctaText || 'Book Now',
      displayOrder: Number(displayOrder || 0),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a banner
const updateBanner = async (req, res, next) => {
  let newImage = null;
  let newVideo = null;
  
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    const { title, link, isActive, type, description, ctaText, displayOrder, startDate, endDate } = req.body;
    
    // Update basic fields
    if (title !== undefined) banner.title = title;
    if (link !== undefined) banner.link = link;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
    if (type !== undefined) banner.type = type;
    if (description !== undefined) banner.description = description;
    if (ctaText !== undefined) banner.ctaText = ctaText;
    if (displayOrder !== undefined) banner.displayOrder = Number(displayOrder || 0);
    
    // Handling dates
    if (startDate !== undefined) banner.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) banner.endDate = endDate ? new Date(endDate) : null;

    let oldImage = banner.image;
    let oldVideo = banner.video;

    // Handle files upload fields
    const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
    const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;

    if (imageFile) {
      newImage = await processAndStoreImage(imageFile.buffer, 'banner');
      banner.image = newImage;
    }

    if (videoFile) {
      newVideo = await processAndStoreVideo(videoFile.buffer, videoFile.mimetype, 'banner-video');
      banner.video = newVideo;
    }

    // Validation checks
    if (banner.type === 'image' && !banner.image && !newImage) {
      return res.status(400).json({ success: false, message: 'Image banner must have an image' });
    }
    if (banner.type === 'video' && !banner.video && !newVideo) {
      return res.status(400).json({ success: false, message: 'Video banner must have a video' });
    }

    await banner.save();

    // After DB save succeeds, delete old image if replaced
    if (newImage && oldImage) {
      deleteImageSafe(oldImage);
    }

    // After DB save succeeds, delete old video if replaced
    if (newVideo && oldVideo) {
      deleteVideoSafe(oldVideo);
    }

    res.json({ success: true, data: banner });
  } catch (error) {
    // Cleanup any uploaded files if the save failed
    if (newImage) deleteImageSafe(newImage);
    if (newVideo) deleteVideoSafe(newVideo);
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

    // Delete video file safely
    if (banner.video) {
      deleteVideoSafe(banner.video);
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
