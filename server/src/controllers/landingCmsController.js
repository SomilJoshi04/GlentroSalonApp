const {
  LandingConfig,
  LandingBanner,
  LandingVideo,
  LandingFeature,
  LandingStep,
  LandingTestimonial,
  LandingStat,
} = require('../models/LandingCMS');
const Category = require('../models/Category');
const FAQ = require('../models/FAQ');
const { processAndStoreImage, deleteImageSafe } = require('../services/imageService');
const { getCache, setCache, deleteCache } = require('../utils/cache');

const LANDING_CACHE_KEY = 'landing:page:public';
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Helper to ensure default config document exists
 */
const getOrCreateDefaultConfig = async () => {
  let config = await LandingConfig.findOne();
  if (!config) {
    config = await LandingConfig.create({
      hero: {
        heading: 'Your Style. Your Salon. Your Choice.',
        subheading: 'Discover top-rated beauty and wellness destinations, pick your favorite stylists, and book appointments in seconds.',
        badgeText: 'All-In-One Salon Booking & Business Management',
        primaryCtaText: 'Login as Customer',
        primaryCtaAction: 'USER_LOGIN',
        secondaryCtaText: 'Login as Vendor',
        secondaryCtaAction: 'VENDOR_LOGIN',
        isActive: true,
      },
      sectionVisibility: {
        hero: true,
        roleCards: true,
        banners: true,
        categories: true,
        features: true,
        howItWorks: true,
        videos: true,
        stats: true,
        testimonials: true,
        faqs: true,
        cta: true,
        footer: true,
      },
      cta: {
        title: 'Ready to Experience Hassle-Free Salon Bookings?',
        description: 'Join thousands of satisfied clients or partner with us to transform your salon operations today.',
        primaryButtonText: 'Book An Appointment',
        primaryButtonAction: 'USER_LOGIN',
        secondaryButtonText: 'Partner With Us',
        secondaryButtonAction: 'VENDOR_LOGIN',
        isActive: true,
      },
      publishStatus: 'PUBLISHED',
    });

    // Populate initial default features if empty
    const featureCount = await LandingFeature.countDocuments({ isDeleted: false });
    if (featureCount === 0) {
      await LandingFeature.insertMany([
        { title: 'Geospatial Search', description: 'High-speed proximity engine displays nearby salons with accurate walking or driving distance.', icon: 'near_me', displayOrder: 1 },
        { title: 'Specialist Selection', description: 'Choose specific staff per service, or let the platform auto-assign available experts seamlessly.', icon: 'badge', displayOrder: 2 },
        { title: 'Atomic Slot Locking', description: 'Distributed bucket locks eliminate double bookings and race conditions across multiple customers.', icon: 'lock_reset', displayOrder: 3 },
        { title: 'Live Chat & Consultations', description: 'Real-time push notifications, messaging, and audio consultations directly between clients and salons.', icon: 'chat', displayOrder: 4 },
      ]);
    }

    // Populate initial default steps if empty
    const stepCount = await LandingStep.countDocuments({ isDeleted: false });
    if (stepCount === 0) {
      await LandingStep.insertMany([
        { stepNumber: 1, title: 'Find Salons Near You', description: 'Browse curated beauty spots with real-time distance and customer reviews.', icon: 'search', targetRole: 'client', displayOrder: 1 },
        { stepNumber: 2, title: 'Pick Services & Stylists', description: 'Select hair, spa, or grooming services and assign your preferred specialist.', icon: 'content_cut', targetRole: 'client', displayOrder: 2 },
        { stepNumber: 3, title: 'Instant Confirmation', description: 'Reserve your time slot with atomic concurrency protection and get instant reminders.', icon: 'event_available', targetRole: 'client', displayOrder: 3 },
        { stepNumber: 1, title: 'Register Your Business', description: 'List your salon branch, services catalog, and staff specialists.', icon: 'storefront', targetRole: 'vendor', displayOrder: 1 },
        { stepNumber: 2, title: 'Manage Rosters & Leaves', description: 'Control staff availability, chair capacity, and dynamic off-peak pricing.', icon: 'schedule', targetRole: 'vendor', displayOrder: 2 },
        { stepNumber: 3, title: 'Receive Direct Payouts', description: 'Verify bookings via OTP and track real-time revenue and settlement transfers.', icon: 'payments', targetRole: 'vendor', displayOrder: 3 },
      ]);
    }

    // Populate initial stats if empty
    const statCount = await LandingStat.countDocuments();
    if (statCount === 0) {
      await LandingStat.insertMany([
        { label: 'Verified Salons', value: '500+', icon: 'store', displayOrder: 1 },
        { label: 'Happy Customers', value: '50,000+', icon: 'sentiment_very_satisfied', displayOrder: 2 },
        { label: 'Services Completed', value: '120,000+', icon: 'task_alt', displayOrder: 3 },
        { label: 'Average Rating', value: '4.9 / 5', icon: 'star', displayOrder: 4 },
      ]);
    }
  }
  return config;
};

// ============================================================================
// PUBLIC & PREVIEW CONTROLLERS
// ============================================================================

/**
 * @desc    Get Published Landing Page Data (Public, Cached)
 * @route   GET /api/landing/public
 */
const getPublicLandingPage = async (req, res, next) => {
  try {
    // 1. Try Redis cache first
    const cachedData = await getCache(LANDING_CACHE_KEY);
    if (cachedData) {
      return res.json({ success: true, data: cachedData });
    }

    // 2. Fetch config
    const config = await getOrCreateDefaultConfig();
    const now = new Date();

    // 3. Fetch active & scheduled banners
    const banners = await LandingBanner.find({
      isDeleted: false,
      isActive: true,
      publishStatus: 'PUBLISHED',
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select('title subtitle description image mobileImage ctaText ctaType ctaDestination displayOrder');

    // 4. Fetch active features
    const features = await LandingFeature.find({ isDeleted: false, isActive: true })
      .sort({ displayOrder: 1 })
      .select('title description icon displayOrder');

    // 5. Fetch active steps (How It Works)
    const steps = await LandingStep.find({ isDeleted: false, isActive: true })
      .sort({ displayOrder: 1, stepNumber: 1 })
      .select('stepNumber title description icon targetRole displayOrder');

    // 6. Fetch guide videos
    const videos = await LandingVideo.find({
      isDeleted: false,
      isActive: true,
      publishStatus: 'PUBLISHED',
    })
      .sort({ displayOrder: 1 })
      .select('title description videoUrl thumbnail duration category displayOrder');

    // 7. Fetch testimonials
    const testimonials = await LandingTestimonial.find({
      isDeleted: false,
      isActive: true,
      publishStatus: 'PUBLISHED',
    })
      .sort({ displayOrder: 1 })
      .select('name role avatar content rating displayOrder');

    // 8. Fetch stats
    const stats = await LandingStat.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .select('label value icon displayOrder');

    // 9. Fetch categories from Category model
    const categories = await Category.find({ isActive: true })
      .limit(10)
      .select('name image');

    // 10. Fetch FAQs from FAQ model
    const faqs = await FAQ.find({ isActive: true })
      .sort({ order: 1 })
      .limit(10)
      .select('question answer order');

    // 11. Format clean DTO
    const publicData = {
      hero: config.hero,
      sectionVisibility: config.sectionVisibility,
      banners: banners || [],
      categories: categories || [],
      features: features || [],
      howItWorks: steps || [],
      videos: videos || [],
      stats: stats || [],
      testimonials: testimonials || [],
      faqs: faqs || [],
      cta: config.cta,
      socialLinks: config.socialLinks,
      footer: config.footer,
      seo: config.seo,
      publishedAt: config.publishedAt,
    };

    // Store in cache
    await setCache(LANDING_CACHE_KEY, publicData, CACHE_TTL_SECONDS);

    res.json({ success: true, data: publicData });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Live Preview (Admin Only, Includes Drafts & Unpublished)
 * @route   GET /api/landing/preview
 */
const getPreviewLandingPage = async (req, res, next) => {
  try {
    const config = await getOrCreateDefaultConfig();

    const banners = await LandingBanner.find({ isDeleted: false })
      .sort({ displayOrder: 1, createdAt: -1 })
      .select('title subtitle description image mobileImage ctaText ctaType ctaDestination displayOrder isActive publishStatus');

    const features = await LandingFeature.find({ isDeleted: false })
      .sort({ displayOrder: 1 })
      .select('title description icon displayOrder isActive');

    const steps = await LandingStep.find({ isDeleted: false })
      .sort({ displayOrder: 1, stepNumber: 1 })
      .select('stepNumber title description icon targetRole displayOrder isActive');

    const videos = await LandingVideo.find({ isDeleted: false })
      .sort({ displayOrder: 1 })
      .select('title description videoUrl thumbnail duration category displayOrder isActive publishStatus');

    const testimonials = await LandingTestimonial.find({ isDeleted: false })
      .sort({ displayOrder: 1 })
      .select('name role avatar content rating displayOrder isActive publishStatus');

    const stats = await LandingStat.find({})
      .sort({ displayOrder: 1 })
      .select('label value icon displayOrder isActive');

    const categories = await Category.find({ isActive: true })
      .limit(10)
      .select('name image');

    const faqs = await FAQ.find({ isActive: true })
      .sort({ order: 1 })
      .limit(10)
      .select('question answer order');

    const previewData = {
      hero: config.hero,
      sectionVisibility: config.sectionVisibility,
      banners,
      categories,
      features,
      howItWorks: steps,
      videos,
      stats,
      testimonials,
      faqs,
      cta: config.cta,
      socialLinks: config.socialLinks,
      footer: config.footer,
      seo: config.seo,
      publishStatus: config.publishStatus,
      publishedAt: config.publishedAt,
      isPreview: true,
    };

    res.json({ success: true, data: previewData });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// ADMIN CMS CONFIG MANAGEMENT
// ============================================================================

/**
 * @desc    Get complete Landing CMS state for Admin Portal
 * @route   GET /api/landing/admin/config
 */
const getCmsConfig = async (req, res, next) => {
  try {
    const config = await getOrCreateDefaultConfig();
    const banners = await LandingBanner.find({ isDeleted: false }).sort({ displayOrder: 1, createdAt: -1 });
    const features = await LandingFeature.find({ isDeleted: false }).sort({ displayOrder: 1 });
    const steps = await LandingStep.find({ isDeleted: false }).sort({ displayOrder: 1, stepNumber: 1 });
    const videos = await LandingVideo.find({ isDeleted: false }).sort({ displayOrder: 1 });
    const testimonials = await LandingTestimonial.find({ isDeleted: false }).sort({ displayOrder: 1 });
    const stats = await LandingStat.find({}).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: {
        config,
        banners,
        features,
        steps,
        videos,
        testimonials,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Landing Config (Hero, CTA, Footer, Social, SEO, Section Visibility)
 * @route   PUT /api/landing/admin/config
 */
const updateCmsConfig = async (req, res, next) => {
  try {
    const { hero, cta, footer, socialLinks, seo, sectionVisibility } = req.body;
    let config = await getOrCreateDefaultConfig();

    if (hero) config.hero = { ...config.hero.toObject(), ...hero };
    if (cta) config.cta = { ...config.cta.toObject(), ...cta };
    if (footer) config.footer = { ...config.footer.toObject(), ...footer };
    if (socialLinks) config.socialLinks = { ...config.socialLinks.toObject(), ...socialLinks };
    if (seo) config.seo = { ...config.seo.toObject(), ...seo };
    if (sectionVisibility) config.sectionVisibility = { ...config.sectionVisibility.toObject(), ...sectionVisibility };

    config.updatedBy = req.user.id;
    await config.save();

    // Invalidate public cache
    await deleteCache(LANDING_CACHE_KEY);

    res.json({ success: true, message: 'Landing CMS configuration saved successfully', data: config });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload Hero / CTA media asset (Admin)
 * @route   POST /api/landing/admin/media-upload
 */
const uploadCmsMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image or video file' });
    }

    const { targetField } = req.body; // 'heroImage', 'ctaBackgroundImage', 'ogImage'
    const newFilename = await processAndStoreImage(req.file.buffer, 'cms');

    let config = await getOrCreateDefaultConfig();
    let oldFile = null;

    if (targetField === 'heroImage') {
      oldFile = config.hero.heroImage;
      config.hero.heroImage = newFilename;
    } else if (targetField === 'ctaBackgroundImage') {
      oldFile = config.cta.backgroundImage;
      config.cta.backgroundImage = newFilename;
    } else if (targetField === 'ogImage') {
      oldFile = config.seo.ogImage;
      config.seo.ogImage = newFilename;
    }

    await config.save();
    if (oldFile) deleteImageSafe(oldFile);

    await deleteCache(LANDING_CACHE_KEY);

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: { filename: newFilename, targetField },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish Draft Changes to Public Site
 * @route   PATCH /api/landing/admin/publish
 */
const publishCmsConfig = async (req, res, next) => {
  try {
    let config = await getOrCreateDefaultConfig();
    config.publishStatus = 'PUBLISHED';
    config.publishedAt = new Date();
    config.updatedBy = req.user.id;
    await config.save();

    await deleteCache(LANDING_CACHE_KEY);

    res.json({
      success: true,
      message: 'Landing page published successfully! Changes are live.',
      data: { publishedAt: config.publishedAt },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// BANNERS CRUD
// ============================================================================

const createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, description, ctaText, ctaType, ctaDestination, displayOrder, startDate, endDate, publishStatus } = req.body;
    let imageFilename = '';

    if (req.file) {
      imageFilename = await processAndStoreImage(req.file.buffer, 'banner');
    } else if (req.body.image) {
      imageFilename = req.body.image;
    } else {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    const banner = await LandingBanner.create({
      title,
      subtitle,
      description,
      image: imageFilename,
      ctaText: ctaText || 'Explore Now',
      ctaType: ctaType || 'EXPLORE_SALONS',
      ctaDestination: ctaDestination || '/salons',
      displayOrder: Number(displayOrder) || 0,
      publishStatus: publishStatus || 'PUBLISHED',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
    });

    await deleteCache(LANDING_CACHE_KEY);
    res.status(201).json({ success: true, message: 'Banner created successfully', data: banner });
  } catch (error) {
    next(error);
  }
};

const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await LandingBanner.findById(id);
    if (!banner || banner.isDeleted) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const updates = { ...req.body };
    if (req.file) {
      const newImage = await processAndStoreImage(req.file.buffer, 'banner');
      if (banner.image) deleteImageSafe(banner.image);
      updates.image = newImage;
    }

    const updated = await LandingBanner.findByIdAndUpdate(id, updates, { new: true });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Banner updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await LandingBanner.findById(id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    banner.isDeleted = true;
    banner.isActive = false;
    await banner.save();

    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const toggleBannerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await LandingBanner.findById(id);
    if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

    banner.isActive = !banner.isActive;
    await banner.save();

    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: `Banner ${banner.isActive ? 'activated' : 'deactivated'}`, data: banner });
  } catch (error) {
    next(error);
  }
};

const reorderBanners = async (req, res, next) => {
  try {
    const { orders } = req.body; // [{ id, displayOrder }]
    if (Array.isArray(orders)) {
      const ops = orders.map(({ id, displayOrder }) => ({
        updateOne: {
          filter: { _id: id },
          update: { displayOrder },
        },
      }));
      await LandingBanner.bulkWrite(ops);
    }
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Banners reordered successfully' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// GUIDE VIDEOS CRUD
// ============================================================================

const createVideo = async (req, res, next) => {
  try {
    const { title, description, videoUrl, duration, category, displayOrder, publishStatus } = req.body;
    let thumbnailFilename = '';

    if (req.file) {
      thumbnailFilename = await processAndStoreImage(req.file.buffer, 'videothumb');
    }

    const video = await LandingVideo.create({
      title,
      description,
      videoUrl,
      thumbnail: thumbnailFilename,
      duration: duration || '',
      category: category || 'CLIENT_GUIDE',
      displayOrder: Number(displayOrder) || 0,
      publishStatus: publishStatus || 'PUBLISHED',
      isActive: true,
    });

    await deleteCache(LANDING_CACHE_KEY);
    res.status(201).json({ success: true, message: 'Guide video added successfully', data: video });
  } catch (error) {
    next(error);
  }
};

const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await LandingVideo.findById(id);
    if (!video || video.isDeleted) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const updates = { ...req.body };
    if (req.file) {
      const newThumb = await processAndStoreImage(req.file.buffer, 'videothumb');
      if (video.thumbnail) deleteImageSafe(video.thumbnail);
      updates.thumbnail = newThumb;
    }

    const updated = await LandingVideo.findByIdAndUpdate(id, updates, { new: true });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Guide video updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await LandingVideo.findById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    video.isDeleted = true;
    video.isActive = false;
    await video.save();

    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const toggleVideoStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await LandingVideo.findById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    video.isActive = !video.isActive;
    await video.save();

    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: `Video ${video.isActive ? 'activated' : 'deactivated'}`, data: video });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// FEATURES CRUD
// ============================================================================

const createFeature = async (req, res, next) => {
  try {
    const { title, description, icon, displayOrder } = req.body;
    const feature = await LandingFeature.create({
      title,
      description,
      icon: icon || 'star',
      displayOrder: Number(displayOrder) || 0,
      isActive: true,
    });
    await deleteCache(LANDING_CACHE_KEY);
    res.status(201).json({ success: true, message: 'Feature card added successfully', data: feature });
  } catch (error) {
    next(error);
  }
};

const updateFeature = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await LandingFeature.findByIdAndUpdate(id, req.body, { new: true });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Feature card updated', data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteFeature = async (req, res, next) => {
  try {
    const { id } = req.params;
    await LandingFeature.findByIdAndUpdate(id, { isDeleted: true, isActive: false });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Feature card removed' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// HOW IT WORKS (STEPS) CRUD
// ============================================================================

const createStep = async (req, res, next) => {
  try {
    const { stepNumber, title, description, icon, targetRole, displayOrder } = req.body;
    const step = await LandingStep.create({
      stepNumber: Number(stepNumber) || 1,
      title,
      description,
      icon: icon || 'check_circle',
      targetRole: targetRole || 'client',
      displayOrder: Number(displayOrder) || 0,
      isActive: true,
    });
    await deleteCache(LANDING_CACHE_KEY);
    res.status(201).json({ success: true, message: 'Workflow step created', data: step });
  } catch (error) {
    next(error);
  }
};

const updateStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await LandingStep.findByIdAndUpdate(id, req.body, { new: true });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Step updated', data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    await LandingStep.findByIdAndUpdate(id, { isDeleted: true, isActive: false });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Step deleted' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// TESTIMONIALS CRUD
// ============================================================================

const createTestimonial = async (req, res, next) => {
  try {
    const { name, role, content, rating, displayOrder, publishStatus } = req.body;
    let avatarFilename = '';
    if (req.file) {
      avatarFilename = await processAndStoreImage(req.file.buffer, 'avatar');
    }

    const testimonial = await LandingTestimonial.create({
      name,
      role: role || 'Customer',
      avatar: avatarFilename,
      content,
      rating: Number(rating) || 5,
      displayOrder: Number(displayOrder) || 0,
      publishStatus: publishStatus || 'PUBLISHED',
      isActive: true,
    });
    await deleteCache(LANDING_CACHE_KEY);
    res.status(201).json({ success: true, message: 'Testimonial added', data: testimonial });
  } catch (error) {
    next(error);
  }
};

const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const testimonial = await LandingTestimonial.findById(id);
    if (!testimonial) return res.status(404).json({ success: false, message: 'Not found' });

    const updates = { ...req.body };
    if (req.file) {
      const newAvatar = await processAndStoreImage(req.file.buffer, 'avatar');
      if (testimonial.avatar) deleteImageSafe(testimonial.avatar);
      updates.avatar = newAvatar;
    }

    const updated = await LandingTestimonial.findByIdAndUpdate(id, updates, { new: true });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Testimonial updated', data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await LandingTestimonial.findByIdAndUpdate(id, { isDeleted: true, isActive: false });
    await deleteCache(LANDING_CACHE_KEY);
    res.json({ success: true, message: 'Testimonial removed' });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// STATISTICS CRUD
// ============================================================================

const saveStats = async (req, res, next) => {
  try {
    const { stats } = req.body; // array of stats [{ label, value, icon, displayOrder, isActive }]
    if (!Array.isArray(stats)) {
      return res.status(400).json({ success: false, message: 'Stats array is required' });
    }

    // Filter out completely blank rows and sanitize
    const cleanedStats = stats
      .filter((s) => s && (s.label || s.value))
      .map((s, idx) => ({
        label: String(s.label || '').trim(),
        value: String(s.value !== undefined && s.value !== null ? s.value : '').trim(),
        icon: String(s.icon || 'trending_up').trim(),
        displayOrder: Number(s.displayOrder !== undefined ? s.displayOrder : idx + 1),
        isActive: s.isActive !== false,
      }));

    // Validate that non-empty rows have both label and value
    for (let i = 0; i < cleanedStats.length; i++) {
      if (!cleanedStats[i].label) {
        return res.status(400).json({
          success: false,
          message: `Statistic metric #${i + 1} is missing a Label (e.g. "Verified Salons")`,
        });
      }
      if (!cleanedStats[i].value) {
        return res.status(400).json({
          success: false,
          message: `Metric "${cleanedStats[i].label}" is missing a Value (e.g. "500+" or "4.9")`,
        });
      }
    }

    await LandingStat.deleteMany({});
    let created = [];
    if (cleanedStats.length > 0) {
      created = await LandingStat.insertMany(cleanedStats);
    }

    await deleteCache(LANDING_CACHE_KEY);
    return res.json({ success: true, message: 'Statistics updated successfully', data: created });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicLandingPage,
  getPreviewLandingPage,
  getCmsConfig,
  updateCmsConfig,
  uploadCmsMedia,
  publishCmsConfig,
  // Banners
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  // Videos
  createVideo,
  updateVideo,
  deleteVideo,
  toggleVideoStatus,
  // Features
  createFeature,
  updateFeature,
  deleteFeature,
  // Steps
  createStep,
  updateStep,
  deleteStep,
  // Testimonials
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  // Stats
  saveStats,
};
