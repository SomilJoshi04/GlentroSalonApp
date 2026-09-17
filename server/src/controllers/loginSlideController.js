const LoginSlide = require('../models/LoginSlide');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');

// Allowed link protocols — prevent XSS via dangerous URL schemes
const ALLOWED_LINK_PREFIXES = ['https://', 'http://', '/'];

/**
 * Validate a CTA link.
 * Rejects javascript:, data:, vbscript:, and any other unsafe protocols.
 */
const isLinkSafe = (link) => {
  if (!link || link.trim() === '') return true; // empty link is fine (button won't show)
  const lower = link.trim().toLowerCase();
  return ALLOWED_LINK_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

/**
 * Validate date range: startDate must be before endDate when both are provided.
 */
const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    if (start >= end) return false;
  }
  return true;
};

// ─── Public ───────────────────────────────────────────────────────────────────

// @desc    Get active, date-valid, ordered login slides (Public — no auth)
// @route   GET /api/login-slides/public
const getActiveLoginSlides = async (req, res, next) => {
  try {
    const now = new Date();

    const query = {
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
    };

    const slides = await LoginSlide.find(query).sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

// @desc    Get all login slides (Admin, paginated + search)
// @route   GET /api/login-slides
const getLoginSlides = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    let query = {};
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (page && limit) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await LoginSlide.countDocuments(query);
      const slides = await LoginSlide.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      return res.json({
        success: true,
        data: {
          slides,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    }

    const slides = await LoginSlide.find(query).sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, data: slides });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a login slide (Admin)
// @route   POST /api/login-slides
const createLoginSlide = async (req, res, next) => {
  try {
    const { title, description, buttonText, buttonLink, isActive, displayOrder, startDate, endDate } = req.body;

    // Image is required for creation
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Slide image is required' });
    }

    // Validate link safety
    if (buttonLink && !isLinkSafe(buttonLink)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid button link. Only https:// links or relative paths (/) are allowed.',
      });
    }

    // Validate date range
    if (!validateDateRange(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    // Process and store image
    const imageFilename = await processAndStoreImage(req.file.buffer, 'login-slide');

    const slide = await LoginSlide.create({
      title: title || '',
      description: description || '',
      image: imageFilename,
      buttonText: buttonText || '',
      buttonLink: buttonLink || '',
      isActive: isActive === 'false' || isActive === false ? false : true,
      displayOrder: Number(displayOrder || 0),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a login slide (Admin)
// @route   PUT /api/login-slides/:id
const updateLoginSlide = async (req, res, next) => {
  let newImageFilename = null;

  try {
    const slide = await LoginSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ success: false, message: 'Login slide not found' });
    }

    const { title, description, buttonText, buttonLink, isActive, displayOrder, startDate, endDate } = req.body;

    // Validate link safety
    const linkToCheck = buttonLink !== undefined ? buttonLink : slide.buttonLink;
    if (linkToCheck && !isLinkSafe(linkToCheck)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid button link. Only https:// links or relative paths (/) are allowed.',
      });
    }

    // Determine dates to validate
    const newStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : slide.startDate;
    const newEndDate = endDate !== undefined ? (endDate ? new Date(endDate) : null) : slide.endDate;
    if (!validateDateRange(newStartDate, newEndDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    // Apply field updates
    if (title !== undefined) slide.title = title;
    if (description !== undefined) slide.description = description;
    if (buttonText !== undefined) slide.buttonText = buttonText;
    if (buttonLink !== undefined) slide.buttonLink = buttonLink;
    if (isActive !== undefined) slide.isActive = isActive === 'true' || isActive === true;
    if (displayOrder !== undefined) slide.displayOrder = Number(displayOrder || 0);
    if (startDate !== undefined) slide.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) slide.endDate = endDate ? new Date(endDate) : null;

    // Handle image replacement
    const oldImage = slide.image;
    if (req.file) {
      newImageFilename = await processAndStoreImage(req.file.buffer, 'login-slide');
      slide.image = newImageFilename;
    }

    await slide.save();

    // Clean up old image after successful DB update
    if (newImageFilename && oldImage) {
      deleteImageSafe(oldImage);
    }

    res.json({ success: true, data: slide });
  } catch (error) {
    // If DB save failed, clean up newly uploaded image to prevent orphans
    if (newImageFilename) {
      deleteImageSafe(newImageFilename);
    }
    next(error);
  }
};

// @desc    Delete a login slide (Admin)
// @route   DELETE /api/login-slides/:id
const deleteLoginSlide = async (req, res, next) => {
  try {
    const slide = await LoginSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ success: false, message: 'Login slide not found' });
    }

    // Remove associated image safely (failure does not block deletion)
    if (slide.image) {
      deleteImageSafe(slide.image);
    }

    await slide.deleteOne();
    res.json({ success: true, message: 'Login slide deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle login slide active status (Admin)
// @route   PATCH /api/login-slides/:id/status
const toggleLoginSlideStatus = async (req, res, next) => {
  try {
    const slide = await LoginSlide.findById(req.params.id);
    if (!slide) {
      return res.status(404).json({ success: false, message: 'Login slide not found' });
    }
    slide.isActive = !slide.isActive;
    await slide.save();
    res.json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder login slides (Admin)
// @route   PATCH /api/login-slides/reorder
// Body: { orders: [{ id, displayOrder }] }
const reorderLoginSlides = async (req, res, next) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: 'orders array is required' });
    }

    const bulkOps = orders.map(({ id, displayOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { displayOrder: Number(displayOrder) } },
      },
    }));

    await LoginSlide.bulkWrite(bulkOps);
    const slides = await LoginSlide.find().sort({ displayOrder: 1, createdAt: -1 });
    res.json({ success: true, message: 'Slides reordered', data: slides });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveLoginSlides,
  getLoginSlides,
  createLoginSlide,
  updateLoginSlide,
  deleteLoginSlide,
  toggleLoginSlideStatus,
  reorderLoginSlides,
};
