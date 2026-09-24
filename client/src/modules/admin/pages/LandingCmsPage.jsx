import { useState, useEffect, useCallback } from 'react';
import {
  getCmsConfig,
  updateCmsConfig,
  publishCmsConfig,
  uploadCmsMedia,
  // Banners
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
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
} from '../services/landingCmsApi';
import ImageUpload from '../../../components/common/ImageUpload';
import Modal from '../../../components/common/Modal';
import { getImageUrl } from '../../../utils/imageUtils';
import toast from 'react-hot-toast';

export default function LandingCmsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // CMS State
  const [config, setConfig] = useState(null);
  const [banners, setBanners] = useState([]);
  const [features, setFeatures] = useState([]);
  const [steps, setSteps] = useState([]);
  const [videos, setVideos] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [stats, setStats] = useState([]);

  // Modals state
  const [bannerModal, setBannerModal] = useState({ open: false, editing: null });
  const [videoModal, setVideoModal] = useState({ open: false, editing: null });
  const [featureModal, setFeatureModal] = useState({ open: false, editing: null });
  const [stepModal, setStepModal] = useState({ open: false, editing: null });
  const [testimonialModal, setTestimonialModal] = useState({ open: false, editing: null });

  // Form states for modals
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    ctaText: 'Explore Salons',
    ctaType: 'EXPLORE_SALONS',
    ctaDestination: '/salons',
    startDate: '',
    endDate: '',
  });
  const [bannerImageFile, setBannerImageFile] = useState(null);

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '',
    category: 'CLIENT_GUIDE',
  });
  const [videoThumbFile, setVideoThumbFile] = useState(null);

  const [featureForm, setFeatureForm] = useState({
    title: '',
    description: '',
    icon: 'star',
    displayOrder: 0,
  });

  const [stepForm, setStepForm] = useState({
    stepNumber: 1,
    title: '',
    description: '',
    icon: 'check_circle',
    targetRole: 'client',
  });

  const [testimonialForm, setTestimonialForm] = useState({
    name: '',
    role: 'Customer',
    content: '',
    rating: 5,
  });
  const [testimonialAvatarFile, setTestimonialAvatarFile] = useState(null);

  // ── Load full CMS Data ────────────────────────────────────────────────────
  const loadCmsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCmsConfig();
      if (res.data?.success) {
        const { config, banners, features, steps, videos, testimonials, stats } = res.data.data;
        setConfig(config);
        setBanners(banners || []);
        setFeatures(features || []);
        setSteps(steps || []);
        setVideos(videos || []);
        setTestimonials(testimonials || []);
        setStats(stats || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Landing CMS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCmsData();
  }, [loadCmsData]);

  // ── Save Sections Config (Hero, CTA, Social, SEO, Footer, Visibility) ─────
  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const res = await updateCmsConfig(config);
      if (res.data?.success) {
        toast.success('Landing settings saved (Draft updated)!');
        setConfig(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // ── Publish Changes ───────────────────────────────────────────────────────
  const handlePublish = async () => {
    try {
      setPublishing(true);
      const res = await publishCmsConfig();
      if (res.data?.success) {
        toast.success('Landing page published! Live changes are now active.');
        await loadCmsData();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish landing page');
    } finally {
      setPublishing(false);
    }
  };

  // ── Banner Handlers ───────────────────────────────────────────────────────
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(bannerForm).forEach((key) => {
        if (bannerForm[key] !== undefined && bannerForm[key] !== null) {
          formData.append(key, bannerForm[key]);
        }
      });
      if (bannerImageFile) {
        formData.append('image', bannerImageFile);
      }

      if (bannerModal.editing) {
        await updateBanner(bannerModal.editing._id, formData);
        toast.success('Banner updated');
      } else {
        if (!bannerImageFile) {
          return toast.error('Please choose a banner image');
        }
        await createBanner(formData);
        toast.success('Banner created');
      }

      setBannerModal({ open: false, editing: null });
      setBannerImageFile(null);
      await loadCmsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save banner');
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteBanner(id);
      toast.success('Banner deleted');
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleBanner = async (id) => {
    try {
      await toggleBannerStatus(id);
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to update banner status');
    }
  };

  // ── Video Handlers ────────────────────────────────────────────────────────
  const handleSaveVideo = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(videoForm).forEach((key) => {
        formData.append(key, videoForm[key]);
      });
      if (videoThumbFile) {
        formData.append('thumbnail', videoThumbFile);
      }

      if (videoModal.editing) {
        await updateVideo(videoModal.editing._id, formData);
        toast.success('Video updated');
      } else {
        await createVideo(formData);
        toast.success('Video created');
      }

      setVideoModal({ open: false, editing: null });
      setVideoThumbFile(null);
      await loadCmsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save video');
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Delete this guide video?')) return;
    try {
      await deleteVideo(id);
      toast.success('Video removed');
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to delete video');
    }
  };

  // ── Feature Handlers ──────────────────────────────────────────────────────
  const handleSaveFeature = async (e) => {
    e.preventDefault();
    try {
      if (featureModal.editing) {
        await updateFeature(featureModal.editing._id, featureForm);
        toast.success('Feature card updated');
      } else {
        await createFeature(featureForm);
        toast.success('Feature card added');
      }
      setFeatureModal({ open: false, editing: null });
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to save feature');
    }
  };

  const handleDeleteFeature = async (id) => {
    if (!window.confirm('Remove this feature card?')) return;
    try {
      await deleteFeature(id);
      toast.success('Feature removed');
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to remove feature');
    }
  };

  // ── Step Handlers ─────────────────────────────────────────────────────────
  const handleSaveStep = async (e) => {
    e.preventDefault();
    try {
      if (stepModal.editing) {
        await updateStep(stepModal.editing._id, stepForm);
        toast.success('Workflow step updated');
      } else {
        await createStep(stepForm);
        toast.success('Workflow step added');
      }
      setStepModal({ open: false, editing: null });
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to save step');
    }
  };

  const handleDeleteStep = async (id) => {
    if (!window.confirm('Remove this step?')) return;
    try {
      await deleteStep(id);
      toast.success('Step deleted');
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to delete step');
    }
  };

  // ── Testimonial Handlers ──────────────────────────────────────────────────
  const handleSaveTestimonial = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(testimonialForm).forEach((key) => {
        formData.append(key, testimonialForm[key]);
      });
      if (testimonialAvatarFile) {
        formData.append('avatar', testimonialAvatarFile);
      }

      if (testimonialModal.editing) {
        await updateTestimonial(testimonialModal.editing._id, formData);
        toast.success('Testimonial updated');
      } else {
        await createTestimonial(formData);
        toast.success('Testimonial added');
      }

      setTestimonialModal({ open: false, editing: null });
      setTestimonialAvatarFile(null);
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to save testimonial');
    }
  };

  const handleDeleteTestimonial = async (id) => {
    if (!window.confirm('Remove this testimonial?')) return;
    try {
      await deleteTestimonial(id);
      toast.success('Testimonial removed');
      await loadCmsData();
    } catch (err) {
      toast.error('Failed to delete testimonial');
    }
  };

  // ── Stats Handler ─────────────────────────────────────────────────────────
  const handleAddStatRow = () => {
    setStats([...stats, { label: '', value: '', icon: 'trending_up', displayOrder: stats.length + 1, isActive: true }]);
  };

  const handleUpdateStat = (index, field, value) => {
    const updated = [...stats];
    updated[index][field] = value;
    setStats(updated);
  };

  const handleDeleteStat = (index) => {
    const updated = stats.filter((_, i) => i !== index);
    setStats(updated);
  };

  const handleSaveStats = async () => {
    // Filter out completely blank rows
    const nonEmptyStats = stats.filter((s) => s.label?.trim() || s.value?.trim());

    if (nonEmptyStats.length === 0) {
      toast.error('Please add at least one statistic metric');
      return;
    }

    // Validate that every metric has both a label and a value
    for (let i = 0; i < nonEmptyStats.length; i++) {
      const s = nonEmptyStats[i];
      if (!s.label?.trim()) {
        toast.error(`Metric #${i + 1} is missing a label (e.g. "Verified Salons")`);
        return;
      }
      if (!s.value?.trim()) {
        toast.error(`"${s.label}" is missing a value (e.g. "500+" or "4.9")`);
        return;
      }
    }

    try {
      await saveStats(nonEmptyStats);
      toast.success('Statistics counters saved successfully');
      await loadCmsData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save statistics');
    }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'Overview & Toggles', icon: 'visibility' },
    { id: 'hero', label: 'Hero Section', icon: 'view_headline' },
    { id: 'banners', label: `Banners (${banners.length})`, icon: 'view_carousel' },
    { id: 'features', label: `Features (${features.length})`, icon: 'featured_play_list' },
    { id: 'howItWorks', label: `How It Works (${steps.length})`, icon: 'alt_route' },
    { id: 'videos', label: `Guide Videos (${videos.length})`, icon: 'smart_display' },
    { id: 'stats', label: 'Statistics', icon: 'query_stats' },
    { id: 'testimonials', label: `Testimonials (${testimonials.length})`, icon: 'rate_review' },
    { id: 'cta', label: 'Bottom CTA', icon: 'campaign' },
    { id: 'footer', label: 'Footer & Social', icon: 'bottom_panel_close' },
    { id: 'seo', label: 'SEO & Meta', icon: 'search_check' },
  ];

  if (loading && !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-sm text-muted-text font-medium">Loading Landing CMS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-inter">
      {/* ─── HEADER BAR ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface">Landing Page CMS</h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                config?.publishStatus === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {config?.publishStatus || 'PUBLISHED'}
            </span>
          </div>
          <p className="text-sm text-muted-text mt-1">
            Administer public banners, guide videos, hero copy, sections, and brand assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/?preview=true"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs sm:text-sm font-semibold hover:bg-purple-100 flex items-center gap-1.5 transition-all shadow-sm"
            title="Preview all changes (including unpublished drafts)"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            <span>Preview Mode</span>
          </a>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-variant flex items-center gap-1.5 transition-all shadow-sm"
            title="View the live public landing page"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            <span>View Live Site</span>
          </a>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-semibold hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">publish</span>
            <span>{publishing ? 'Publishing...' : 'Publish to Live'}</span>
          </button>
        </div>
      </div>

      {/* ─── NAVIGATION TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shrink-0 transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-muted-text hover:text-on-surface hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: OVERVIEW & SECTION TOGGLES ────────────────────────────── */}
      {activeTab === 'overview' && config && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Section Visibility Controls</h2>
            <p className="text-xs sm:text-sm text-muted-text">
              Turn public landing page sections on or off instantly without deleting content.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(config.sectionVisibility || {}).map((secKey) => (
              <div
                key={secKey}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm capitalize text-on-surface block">
                    {secKey.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-xs text-muted-text">
                    {config.sectionVisibility[secKey] ? 'Visible on Landing' : 'Hidden from Public'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sectionVisibility[secKey]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sectionVisibility: {
                          ...config.sectionVisibility,
                          [secKey]: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Visibility Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: HERO SECTION ─────────────────────────────────────────── */}
      {activeTab === 'hero' && config && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Hero Section Management</h2>
            <p className="text-xs sm:text-sm text-muted-text">
              Customize the prominent headline, subtitle, badge, and primary call-to-action buttons.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Pill Badge Text</label>
              <input
                type="text"
                value={config.hero.badgeText}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, badgeText: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Main Heading</label>
              <input
                type="text"
                value={config.hero.heading}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, heading: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Subheading / Description</label>
              <textarea
                rows={3}
                value={config.hero.subheading}
                onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subheading: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Primary CTA Label</label>
                <input
                  type="text"
                  value={config.hero.primaryCtaText}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, primaryCtaText: e.target.value } })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Secondary CTA Label</label>
                <input
                  type="text"
                  value={config.hero.secondaryCtaText}
                  onChange={(e) => setConfig({ ...config, hero: { ...config.hero, secondaryCtaText: e.target.value } })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Hero Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BANNERS ──────────────────────────────────────────────── */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Promotional Banners</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Manage high-visibility promotional banners displayed in the hero carousel.
              </p>
            </div>
            <button
              onClick={() => {
                setBannerForm({
                  title: '',
                  subtitle: '',
                  description: '',
                  ctaText: 'Explore Salons',
                  ctaType: 'EXPLORE_SALONS',
                  ctaDestination: '/salons',
                  startDate: '',
                  endDate: '',
                });
                setBannerImageFile(null);
                setBannerModal({ open: true, editing: null });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Banner</span>
            </button>
          </div>

          {banners.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-2xl border border-border text-muted-text">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">view_carousel</span>
              <p className="font-semibold text-sm">No banners created yet.</p>
              <p className="text-xs mt-1">Create banners to advertise promotions and events on the landing page.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((b) => (
                <div key={b._id} className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img src={getImageUrl(b.image)} alt={b.title} className="w-full h-full object-cover" />
                    <span
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white/80'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-on-surface mb-1">{b.title}</h4>
                      {b.subtitle && <p className="text-xs text-primary font-semibold mb-2">{b.subtitle}</p>}
                      {b.description && <p className="text-xs text-muted-text line-clamp-2 mb-3">{b.description}</p>}
                      <div className="text-[11px] text-muted-text bg-background p-2 rounded-lg mb-3">
                        CTA: <span className="font-semibold text-on-surface">{b.ctaText}</span> ({b.ctaType})
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <button
                        onClick={() => handleToggleBanner(b._id)}
                        className="text-xs font-semibold text-muted-text hover:text-on-surface"
                      >
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setBannerForm({
                              title: b.title,
                              subtitle: b.subtitle || '',
                              description: b.description || '',
                              ctaText: b.ctaText || '',
                              ctaType: b.ctaType || 'EXPLORE_SALONS',
                              ctaDestination: b.ctaDestination || '/salons',
                              startDate: b.startDate ? b.startDate.substring(0, 10) : '',
                              endDate: b.endDate ? b.endDate.substring(0, 10) : '',
                            });
                            setBannerModal({ open: true, editing: b });
                          }}
                          className="p-1.5 rounded-lg hover:bg-surface-variant text-muted-text hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(b._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-text hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FEATURES ─────────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Landing Features & Highlights</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Value propositions displayed in the 4-column feature highlights section.
              </p>
            </div>
            <button
              onClick={() => {
                setFeatureForm({ title: '', description: '', icon: 'star', displayOrder: features.length + 1 });
                setFeatureModal({ open: true, editing: null });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Feature</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f._id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">{f.icon || 'star'}</span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-text leading-relaxed">{f.description}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setFeatureForm({ title: f.title, description: f.description, icon: f.icon || 'star', displayOrder: f.displayOrder || 0 });
                      setFeatureModal({ open: true, editing: f });
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-variant text-muted-text hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFeature(f._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-text hover:text-red-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: HOW IT WORKS (STEPS) ─────────────────────────────────── */}
      {activeTab === 'howItWorks' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">How It Works Workflow</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Manage the interactive walkthrough steps for Clients and Salon Owners.
              </p>
            </div>
            <button
              onClick={() => {
                setStepForm({ stepNumber: 1, title: '', description: '', icon: 'check_circle', targetRole: 'client' });
                setStepModal({ open: true, editing: null });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Step</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Steps */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>Client Workflow Steps</span>
              </h3>
              {steps.filter((s) => s.targetRole === 'client' || s.targetRole === 'all').map((s) => (
                <div key={s._id} className="p-4 rounded-xl border border-border bg-background flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {s.stepNumber}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">{s.title}</h5>
                      <p className="text-xs text-muted-text mt-0.5">{s.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setStepForm(s);
                        setStepModal({ open: true, editing: s });
                      }}
                      className="p-1 rounded text-muted-text hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteStep(s._id)} className="p-1 rounded text-muted-text hover:text-red-600">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vendor Steps */}
            <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-[#810041] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">storefront</span>
                <span>Salon Owner Workflow Steps</span>
              </h3>
              {steps.filter((s) => s.targetRole === 'vendor').map((s) => (
                <div key={s._id} className="p-4 rounded-xl border border-border bg-background flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-[#810041] font-bold text-xs flex items-center justify-center shrink-0">
                      {s.stepNumber}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-on-surface">{s.title}</h5>
                      <p className="text-xs text-muted-text mt-0.5">{s.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setStepForm(s);
                        setStepModal({ open: true, editing: s });
                      }}
                      className="p-1 rounded text-muted-text hover:text-[#810041]"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteStep(s._id)} className="p-1 rounded text-muted-text hover:text-red-600">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: GUIDE VIDEOS ─────────────────────────────────────────── */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Guide & Tutorial Videos</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Videos demonstrating how to book appointments, manage salons, and choose staff.
              </p>
            </div>
            <button
              onClick={() => {
                setVideoForm({ title: '', description: '', videoUrl: '', duration: '', category: 'CLIENT_GUIDE' });
                setVideoThumbFile(null);
                setVideoModal({ open: true, editing: null });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Video</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videos.map((v) => (
              <div key={v._id} className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-40 bg-slate-900 flex items-center justify-center">
                  {v.thumbnail ? (
                    <img src={getImageUrl(v.thumbnail)} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-white/40">play_circle</span>
                  )}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                    {v.duration || 'Video'}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-1">
                      {v.category?.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-sm text-on-surface mb-1">{v.title}</h4>
                    <p className="text-xs text-muted-text line-clamp-2">{v.description}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-border">
                    <button
                      onClick={() => {
                        setVideoForm(v);
                        setVideoModal({ open: true, editing: v });
                      }}
                      className="p-1.5 rounded-lg hover:bg-surface-variant text-muted-text hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteVideo(v._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-text hover:text-red-600">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 7: STATS ────────────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Statistics & Social Proof</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Metric counters displayed prominently to boost visitor trust.
              </p>
            </div>
            <button
              onClick={handleAddStatRow}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-surface-variant flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Metric</span>
            </button>
          </div>

          <div className="space-y-3">
            {stats.map((st, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-background rounded-xl border border-border">
                <div className="w-full sm:w-1/3">
                  <input
                    type="text"
                    placeholder="Metric Value (e.g. 500+)*"
                    value={st.value}
                    onChange={(e) => handleUpdateStat(idx, 'value', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm font-bold ${
                      st.label && !st.value ? 'border-rose-400 bg-rose-50/30' : 'border-border'
                    }`}
                  />
                  {st.label && !st.value && (
                    <span className="text-[10px] text-rose-500 font-medium pl-1">Value required</span>
                  )}
                </div>
                <div className="w-full sm:w-1/2">
                  <input
                    type="text"
                    placeholder="Metric Label (e.g. Verified Salons)*"
                    value={st.label}
                    onChange={(e) => handleUpdateStat(idx, 'label', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm ${
                      st.value && !st.label ? 'border-rose-400 bg-rose-50/30' : 'border-border'
                    }`}
                  />
                  {st.value && !st.label && (
                    <span className="text-[10px] text-rose-500 font-medium pl-1">Label required</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Material Icon"
                  value={st.icon}
                  onChange={(e) => handleUpdateStat(idx, 'icon', e.target.value)}
                  className="w-full sm:w-32 px-3 py-2 rounded-lg border border-border bg-surface text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteStat(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                  title="Remove Metric"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveStats}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark shadow-sm"
            >
              Save Statistics
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 8: TESTIMONIALS ─────────────────────────────────────────── */}
      {activeTab === 'testimonials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Client & Partner Testimonials</h2>
              <p className="text-xs sm:text-sm text-muted-text">
                Approved reviews showcasing real experiences from users and salon owners.
              </p>
            </div>
            <button
              onClick={() => {
                setTestimonialForm({ name: '', role: 'Customer', content: '', rating: 5 });
                setTestimonialAvatarFile(null);
                setTestimonialModal({ open: true, editing: null });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t._id} className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {t.avatar ? (
                      <img src={getImageUrl(t.avatar)} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                        {t.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{t.name}</h4>
                      <p className="text-xs text-muted-text">{t.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic mb-3">&ldquo;{t.content}&rdquo;</p>
                  <div className="flex text-amber-400 text-sm">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[16px] text-amber-400 fill-current">star</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setTestimonialForm(t);
                      setTestimonialModal({ open: true, editing: t });
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface-variant text-muted-text hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => handleDeleteTestimonial(t._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-text hover:text-red-600">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 9: BOTTOM CTA ───────────────────────────────────────────── */}
      {activeTab === 'cta' && config && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Bottom Call-To-Action Banner</h2>
            <p className="text-xs sm:text-sm text-muted-text">
              The high-conversion closing section that prompts visitors to book or partner.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">CTA Heading Title</label>
              <input
                type="text"
                value={config.cta.title}
                onChange={(e) => setConfig({ ...config, cta: { ...config.cta, title: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">CTA Description Paragraph</label>
              <textarea
                rows={2}
                value={config.cta.description}
                onChange={(e) => setConfig({ ...config, cta: { ...config.cta, description: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Primary Button Text</label>
                <input
                  type="text"
                  value={config.cta.primaryButtonText}
                  onChange={(e) => setConfig({ ...config, cta: { ...config.cta, primaryButtonText: e.target.value } })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Secondary Button Text</label>
                <input
                  type="text"
                  value={config.cta.secondaryButtonText}
                  onChange={(e) => setConfig({ ...config, cta: { ...config.cta, secondaryButtonText: e.target.value } })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save CTA Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 10: FOOTER & SOCIAL ─────────────────────────────────────── */}
      {activeTab === 'footer' && config && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Footer & Social Channels</h2>
            <p className="text-xs sm:text-sm text-muted-text">
              Configure bottom contact details, copyright notice, and social media profile URLs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-muted-text mb-1">Footer Description</label>
              <textarea
                rows={2}
                value={config.footer.description}
                onChange={(e) => setConfig({ ...config, footer: { ...config.footer, description: e.target.value } })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Support Email</label>
              <input
                type="email"
                value={config.footer.supportEmail}
                onChange={(e) => setConfig({ ...config, footer: { ...config.footer, supportEmail: e.target.value } })}
                placeholder="support@salon.com"
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Support Phone</label>
              <input
                type="text"
                value={config.footer.supportPhone}
                onChange={(e) => setConfig({ ...config, footer: { ...config.footer, supportPhone: e.target.value } })}
                placeholder="+1 800 000 0000"
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Instagram URL</label>
              <input
                type="url"
                value={config.socialLinks.instagram}
                onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, instagram: e.target.value } })}
                placeholder="https://instagram.com/..."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Facebook URL</label>
              <input
                type="url"
                value={config.socialLinks.facebook}
                onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, facebook: e.target.value } })}
                placeholder="https://facebook.com/..."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">YouTube URL</label>
              <input
                type="url"
                value={config.socialLinks.youtube}
                onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, youtube: e.target.value } })}
                placeholder="https://youtube.com/..."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={config.socialLinks.linkedin}
                onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, linkedin: e.target.value } })}
                placeholder="https://linkedin.com/..."
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Footer & Social'}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 11: SEO SETTINGS ────────────────────────────────────────── */}
      {activeTab === 'seo' && config && (
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Landing SEO & Metadata</h2>
            <p className="text-xs sm:text-sm text-muted-text">
              Optimize search visibility, Open Graph share previews, and search engine crawling.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Document Meta Title</label>
              <input
                type="text"
                value={config.seo.metaTitle}
                onChange={(e) => setConfig({ ...config, seo: { ...config.seo, metaTitle: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Meta Description</label>
              <textarea
                rows={3}
                value={config.seo.metaDescription}
                onChange={(e) => setConfig({ ...config, seo: { ...config.seo, metaDescription: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Meta Keywords (Comma separated)</label>
              <input
                type="text"
                value={config.seo.keywords}
                onChange={(e) => setConfig({ ...config, seo: { ...config.seo, keywords: e.target.value } })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save SEO Config'}
            </button>
          </div>
        </div>
      )}

      {/* ─── BANNER MODAL ─────────────────────────────────────────────────── */}
      {bannerModal.open && (
        <Modal
          isOpen={bannerModal.open}
          onClose={() => setBannerModal({ open: false, editing: null })}
          title={bannerModal.editing ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
        >
          <form onSubmit={handleSaveBanner} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Banner Title *</label>
              <input
                type="text"
                required
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                placeholder="e.g. Summer Glow Up Sale"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Subtitle / Badge</label>
              <input
                type="text"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                placeholder="e.g. Up to 40% Off"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Description</label>
              <textarea
                rows={2}
                value={bannerForm.description}
                onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                placeholder="Short banner summary"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">CTA Label</label>
                <input
                  type="text"
                  value={bannerForm.ctaText}
                  onChange={(e) => setBannerForm({ ...bannerForm, ctaText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">CTA Action Type</label>
                <select
                  value={bannerForm.ctaType}
                  onChange={(e) => setBannerForm({ ...bannerForm, ctaType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                >
                  <option value="EXPLORE_SALONS">Explore Salons (/salons)</option>
                  <option value="USER_LOGIN">Customer Login (/login)</option>
                  <option value="VENDOR_LOGIN">Vendor Login (/vendor/login)</option>
                  <option value="EXTERNAL_URL">Custom / External URL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Banner Image *</label>
              <ImageUpload
                currentImage={bannerModal.editing?.image}
                onFileSelect={setBannerImageFile}
                label=""
                maxSizeMB={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setBannerModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                Save Banner
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── VIDEO MODAL ─────────────────────────────────────────────────── */}
      {videoModal.open && (
        <Modal
          isOpen={videoModal.open}
          onClose={() => setVideoModal({ open: false, editing: null })}
          title={videoModal.editing ? 'Edit Guide Video' : 'Add Guide Video'}
        >
          <form onSubmit={handleSaveVideo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Video Title *</label>
              <input
                type="text"
                required
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="e.g. How to book your first appointment"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Video URL (YouTube / Embed / Direct MP4) *</label>
              <input
                type="url"
                required
                value={videoForm.videoUrl}
                onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Target Audience</label>
                <select
                  value={videoForm.category}
                  onChange={(e) => setVideoForm({ ...videoForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                >
                  <option value="CLIENT_GUIDE">Customer Guide</option>
                  <option value="VENDOR_GUIDE">Salon Owner / Vendor Guide</option>
                  <option value="PLATFORM_OVERVIEW">Platform Overview</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Duration Tag</label>
                <input
                  type="text"
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                  placeholder="e.g. 2:15 min"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Video Thumbnail Poster</label>
              <ImageUpload
                currentImage={videoModal.editing?.thumbnail}
                onFileSelect={setVideoThumbFile}
                label=""
                maxSizeMB={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setVideoModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                Save Video
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── FEATURE MODAL ───────────────────────────────────────────────── */}
      {featureModal.open && (
        <Modal
          isOpen={featureModal.open}
          onClose={() => setFeatureModal({ open: false, editing: null })}
          title={featureModal.editing ? 'Edit Feature Highlight' : 'Add Feature Highlight'}
        >
          <form onSubmit={handleSaveFeature} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Feature Title *</label>
              <input
                type="text"
                required
                value={featureForm.title}
                onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Description *</label>
              <textarea
                rows={2}
                required
                value={featureForm.description}
                onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Material Icon Name</label>
              <input
                type="text"
                value={featureForm.icon}
                onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })}
                placeholder="e.g. near_me, badge, lock_reset, chat"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setFeatureModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                Save Feature
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── STEP MODAL ──────────────────────────────────────────────────── */}
      {stepModal.open && (
        <Modal
          isOpen={stepModal.open}
          onClose={() => setStepModal({ open: false, editing: null })}
          title={stepModal.editing ? 'Edit How-It-Works Step' : 'Add How-It-Works Step'}
        >
          <form onSubmit={handleSaveStep} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Step Number *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stepForm.stepNumber}
                  onChange={(e) => setStepForm({ ...stepForm, stepNumber: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Target Audience</label>
                <select
                  value={stepForm.targetRole}
                  onChange={(e) => setStepForm({ ...stepForm, targetRole: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                >
                  <option value="client">Client / Customer</option>
                  <option value="vendor">Salon Owner / Vendor</option>
                  <option value="all">Universal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Step Title *</label>
              <input
                type="text"
                required
                value={stepForm.title}
                onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Step Description *</label>
              <textarea
                rows={2}
                required
                value={stepForm.description}
                onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStepModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                Save Step
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─── TESTIMONIAL MODAL ───────────────────────────────────────────── */}
      {testimonialModal.open && (
        <Modal
          isOpen={testimonialModal.open}
          onClose={() => setTestimonialModal({ open: false, editing: null })}
          title={testimonialModal.editing ? 'Edit Testimonial' : 'Add Testimonial'}
        >
          <form onSubmit={handleSaveTestimonial} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Reviewer Name *</label>
                <input
                  type="text"
                  required
                  value={testimonialForm.name}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1">Role / Location</label>
                <input
                  type="text"
                  value={testimonialForm.role}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, role: e.target.value })}
                  placeholder="e.g. Regular Client, Salon Partner"
                  className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Review Text *</label>
              <textarea
                rows={3}
                required
                value={testimonialForm.content}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Rating (1 to 5 Stars)</label>
              <select
                value={testimonialForm.rating}
                onChange={(e) => setTestimonialForm({ ...testimonialForm, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              >
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1">Avatar Photo</label>
              <ImageUpload
                currentImage={testimonialModal.editing?.avatar}
                onFileSelect={setTestimonialAvatarFile}
                label=""
                maxSizeMB={1}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setTestimonialModal({ open: false, editing: null })}
                className="px-4 py-2 rounded-xl border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                Save Review
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
