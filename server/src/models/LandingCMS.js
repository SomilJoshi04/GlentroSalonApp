const mongoose = require('mongoose');

/**
 * LandingConfigSchema — Singleton storing section-level settings,
 * hero copy, CTA copy, footer, social links, SEO, and section visibility.
 */
const landingConfigSchema = new mongoose.Schema(
  {
    hero: {
      heading: {
        type: String,
        trim: true,
        default: 'Your Style. Your Salon. Your Choice.',
      },
      subheading: {
        type: String,
        trim: true,
        default: 'Discover top-rated beauty and wellness destinations, pick your favorite stylists, and book appointments in seconds.',
      },
      badgeText: {
        type: String,
        trim: true,
        default: 'All-In-One Salon Booking & Business Management',
      },
      primaryCtaText: {
        type: String,
        trim: true,
        default: 'Login as Customer',
      },
      primaryCtaAction: {
        type: String,
        enum: ['USER_LOGIN', 'VENDOR_LOGIN', 'EXPLORE_SALONS', 'EXTERNAL_URL'],
        default: 'USER_LOGIN',
      },
      secondaryCtaText: {
        type: String,
        trim: true,
        default: 'Login as Vendor',
      },
      secondaryCtaAction: {
        type: String,
        enum: ['USER_LOGIN', 'VENDOR_LOGIN', 'EXPLORE_SALONS', 'EXTERNAL_URL'],
        default: 'VENDOR_LOGIN',
      },
      heroImage: {
        type: String,
        default: '',
      },
      heroVideo: {
        type: String,
        default: '',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    sectionVisibility: {
      hero: { type: Boolean, default: true },
      roleCards: { type: Boolean, default: true },
      banners: { type: Boolean, default: true },
      categories: { type: Boolean, default: true },
      features: { type: Boolean, default: true },
      howItWorks: { type: Boolean, default: true },
      videos: { type: Boolean, default: true },
      stats: { type: Boolean, default: true },
      testimonials: { type: Boolean, default: true },
      faqs: { type: Boolean, default: true },
      cta: { type: Boolean, default: true },
      footer: { type: Boolean, default: true },
    },
    cta: {
      title: {
        type: String,
        trim: true,
        default: 'Ready to Experience Hassle-Free Salon Bookings?',
      },
      description: {
        type: String,
        trim: true,
        default: 'Join thousands of satisfied clients or partner with us to transform your salon operations today.',
      },
      primaryButtonText: {
        type: String,
        trim: true,
        default: 'Book An Appointment',
      },
      primaryButtonAction: {
        type: String,
        enum: ['USER_LOGIN', 'VENDOR_LOGIN', 'EXPLORE_SALONS', 'EXTERNAL_URL'],
        default: 'USER_LOGIN',
      },
      secondaryButtonText: {
        type: String,
        trim: true,
        default: 'Partner With Us',
      },
      secondaryButtonAction: {
        type: String,
        enum: ['USER_LOGIN', 'VENDOR_LOGIN', 'EXPLORE_SALONS', 'EXTERNAL_URL'],
        default: 'VENDOR_LOGIN',
      },
      backgroundImage: {
        type: String,
        default: '',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    socialLinks: {
      instagram: { type: String, trim: true, default: '' },
      facebook: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
    },
    footer: {
      description: {
        type: String,
        trim: true,
        default: 'The modern destination for booking salon services, choosing verified staff specialists, and scaling salon businesses.',
      },
      copyrightText: {
        type: String,
        trim: true,
        default: '© All rights reserved.',
      },
      supportEmail: { type: String, trim: true, default: '' },
      supportPhone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        default: 'Glentro Salon | Discover & Book Premier Salons',
      },
      metaDescription: {
        type: String,
        trim: true,
        default: 'Discover top-rated salons, choose your favorite stylists, and book appointments effortlessly.',
      },
      ogTitle: { type: String, trim: true, default: '' },
      ogDescription: { type: String, trim: true, default: '' },
      ogImage: { type: String, default: '' },
      canonicalUrl: { type: String, trim: true, default: '' },
      keywords: { type: String, trim: true, default: 'salon, booking, beauty, hair, stylist, spa' },
    },
    publishStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'PUBLISHED',
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

/**
 * LandingBannerSchema — Dynamic promo banners with scheduling, CTA types, and ordering.
 */
const landingBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    image: { type: String, required: true },
    mobileImage: { type: String, default: '' },
    ctaText: { type: String, trim: true, default: 'Learn More' },
    ctaType: {
      type: String,
      enum: ['USER_LOGIN', 'VENDOR_LOGIN', 'EXPLORE_SALONS', 'EXTERNAL_URL'],
      default: 'EXPLORE_SALONS',
    },
    ctaDestination: { type: String, trim: true, default: '/salons' },
    displayOrder: { type: Number, default: 0 },
    publishStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'PUBLISHED',
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * LandingVideoSchema — Guide & tutorial videos for clients and vendors.
 */
const landingVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    videoUrl: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: '' },
    duration: { type: String, trim: true, default: '' },
    category: {
      type: String,
      enum: ['CLIENT_GUIDE', 'VENDOR_GUIDE', 'PLATFORM_OVERVIEW'],
      default: 'CLIENT_GUIDE',
    },
    displayOrder: { type: Number, default: 0 },
    publishStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'PUBLISHED',
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * LandingFeatureSchema — Value props / features displayed on public landing page.
 */
const landingFeatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: 'star' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * LandingStepSchema — "How It Works" steps for clients and salon owners.
 */
const landingStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: 'check_circle' },
    targetRole: {
      type: String,
      enum: ['client', 'vendor', 'all'],
      default: 'client',
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * LandingTestimonialSchema — Curated client/vendor reviews with admin moderation.
 */
const landingTestimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: 'Customer' },
    avatar: { type: String, default: '' },
    content: { type: String, required: true, trim: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    displayOrder: { type: Number, default: 0 },
    publishStatus: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'PUBLISHED',
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * LandingStatSchema — Dynamic counters and proof metrics.
 */
const landingStatSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    icon: { type: String, trim: true, default: 'trending_up' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LandingConfig = mongoose.model('LandingConfig', landingConfigSchema);
const LandingBanner = mongoose.model('LandingBanner', landingBannerSchema);
const LandingVideo = mongoose.model('LandingVideo', landingVideoSchema);
const LandingFeature = mongoose.model('LandingFeature', landingFeatureSchema);
const LandingStep = mongoose.model('LandingStep', landingStepSchema);
const LandingTestimonial = mongoose.model('LandingTestimonial', landingTestimonialSchema);
const LandingStat = mongoose.model('LandingStat', landingStatSchema);

module.exports = {
  LandingConfig,
  LandingBanner,
  LandingVideo,
  LandingFeature,
  LandingStep,
  LandingTestimonial,
  LandingStat,
};
