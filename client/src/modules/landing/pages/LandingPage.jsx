import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings } from '../../../context/SettingContext';
import { useAuth } from '../../../context/AuthContext';
import { getImageUrl } from '../../../utils/imageUtils';
import { getPublicLandingPage, getPreviewLandingPage } from '../../admin/services/landingCmsApi';

export default function LandingPage() {
  const { settings } = useSettings();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true' && !!admin;

  const [cmsData, setCmsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  // Dynamic UI states
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('client');
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Banner carousel state
  const [currentBanner, setCurrentBanner] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const bannerTimerRef = useRef(null);

  const appName = settings?.appName || 'Glentro Salon';

  // ── Load CMS Content ──────────────────────────────────────────────────────
  const fetchLandingData = useCallback(async () => {
    try {
      setLoading(true);
      const res = isPreviewMode ? await getPreviewLandingPage() : await getPublicLandingPage();
      if (res.data?.success && res.data.data) {
        setCmsData(res.data.data);
      }
    } catch (err) {
      console.warn('Landing CMS fetch fallback triggered:', err.message);
      // Safe fallback data if backend is unreachable
      setCmsData({
        hero: {
          heading: 'Your Style. Your Salon. Your Choice.',
          subheading: 'Discover top-rated beauty and wellness destinations, pick your favorite stylists, and book appointments in seconds.',
          badgeText: 'All-In-One Salon Booking & Business Management',
          primaryCtaText: 'Login as Customer',
          secondaryCtaText: 'Login as Vendor',
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
        banners: [],
        features: [],
        howItWorks: [],
        videos: [],
        stats: [],
        testimonials: [],
        faqs: [],
        cta: {
          title: 'Ready to Experience Hassle-Free Salon Bookings?',
          description: 'Join thousands of satisfied clients or partner with us to transform your salon operations today.',
          primaryButtonText: 'Book An Appointment',
          secondaryButtonText: 'Partner With Us',
          isActive: true,
        },
        socialLinks: {},
        footer: {
          description: 'The modern destination for booking salon services, choosing verified staff specialists, and scaling salon businesses.',
          copyrightText: '© All rights reserved.',
        },
        seo: {},
      });
    } finally {
      setLoading(false);
    }
  }, [isPreviewMode]);

  useEffect(() => {
    fetchLandingData();
  }, [fetchLandingData]);

  // ── Dynamic SEO & Metadata ────────────────────────────────────────────────
  useEffect(() => {
    const metaTitle = cmsData?.seo?.metaTitle || `${appName} | Discover & Book Premier Salons`;
    const metaDescription =
      cmsData?.seo?.metaDescription ||
      `Discover top-rated salons, choose your favorite stylists, and book appointments effortlessly with ${appName}. Manage your salon business with dedicated vendor tools.`;

    document.title = metaTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = metaDescription;
  }, [cmsData, appName]);

  // ── Banner Carousel Autoplay ──────────────────────────────────────────────
  const banners = cmsData?.banners || [];
  const nextBanner = useCallback(() => {
    if (banners.length > 1) {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }
  }, [banners.length]);

  const prevBanner = useCallback(() => {
    if (banners.length > 1) {
      setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
    }
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || bannerPaused) {
      clearInterval(bannerTimerRef.current);
      return;
    }
    bannerTimerRef.current = setInterval(nextBanner, 5000);
    return () => clearInterval(bannerTimerRef.current);
  }, [banners.length, bannerPaused, nextBanner]);

  // ── CTA Destination Router ────────────────────────────────────────────────
  const handleCtaClick = (ctaType, ctaDestination) => {
    if (ctaType === 'USER_LOGIN') navigate('/login');
    else if (ctaType === 'VENDOR_LOGIN') navigate('/vendor/login');
    else if (ctaType === 'EXPLORE_SALONS') navigate('/salons');
    else if (ctaDestination) {
      if (ctaDestination.startsWith('http://') || ctaDestination.startsWith('https://')) {
        window.open(ctaDestination, '_blank', 'noopener,noreferrer');
      } else {
        navigate(ctaDestination);
      }
    } else {
      navigate('/login');
    }
  };

  const isVisible = (sectionKey) => {
    if (!cmsData?.sectionVisibility) return true;
    return cmsData.sectionVisibility[sectionKey] !== false;
  };

  // ── SKELETON LOADING ──────────────────────────────────────────────────────
  if (loading && !cmsData) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-[#54238f] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading experience...</p>
      </div>
    );
  }

  const hero = cmsData?.hero || {};
  const cta = cmsData?.cta || {};
  const footer = cmsData?.footer || {};
  const socialLinks = cmsData?.socialLinks || {};

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#121c2a] flex flex-col font-sans selection:bg-purple-500/20 selection:text-purple-700">
      {/* ─── ADMIN PREVIEW & TOOLBAR NOTICE ─────────────────────────────── */}
      {admin && (
        <div className="sticky top-0 z-50 bg-[#1e1b4b] text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-400">
              {isPreviewMode ? 'visibility' : 'verified_user'}
            </span>
            <span className="font-semibold">
              {isPreviewMode
                ? 'CMS Preview Mode — Showing draft, scheduled & published content'
                : 'Live Public View (Viewing as Administrator)'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isPreviewMode ? (
              <Link to="/" className="text-amber-300 hover:text-white underline font-medium">
                Switch to Live View
              </Link>
            ) : (
              <Link to="/?preview=true" className="text-amber-300 hover:text-white underline font-medium">
                Switch to Preview Mode
              </Link>
            )}
            <Link
              to="/admin/landing-cms"
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all"
            >
              CMS Editor
            </Link>
            <Link
              to="/admin"
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-semibold transition-all"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* ─── HEADER / NAVIGATION ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            {settings?.appLogo && !logoError ? (
              <img
                src={getImageUrl(settings.appLogo)}
                alt={`${appName} Logo`}
                onError={() => setLogoError(true)}
                className="h-10 md:h-12 w-auto object-contain rounded-xl"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#54238f] to-[#7031d9] flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200">
                <span className="material-symbols-outlined text-[26px]">spa</span>
              </div>
            )}
            <div>
              <span className="font-headline font-bold text-xl md:text-2xl text-[#121c2a] tracking-tight block leading-tight">
                {appName}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700/80">
                Beauty & Wellness Platform
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/salons"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Explore Salons</span>
            </Link>
            <Link
              to="/vendor/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span>Vendor Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── MAIN BODY ──────────────────────────────────────────────────── */}
      <main className="flex-grow">
        {/* ─── 1. HERO SECTION ──────────────────────────────────────────── */}
        {isVisible('hero') && (
          <section className="relative overflow-hidden pt-12 pb-14 md:pt-18 md:pb-20 px-4 sm:px-6 lg:px-8">
            {/* Ambient gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-purple-200/40 via-purple-50/20 to-transparent blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              {hero.badgeText && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-purple-800 text-xs md:text-sm font-semibold tracking-wide shadow-sm mb-6 animate-fade-in">
                  <span className="material-symbols-outlined text-[18px] text-purple-600">auto_awesome</span>
                  <span>{hero.badgeText}</span>
                </div>
              )}

              {/* Main Headline */}
              <h1 className="font-headline text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#121c2a] tracking-tight leading-[1.15] mb-6">
                {hero.heading || 'Your Style. Your Salon. Your Choice.'}
              </h1>

              {/* Subheading */}
              <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-slate-600 font-normal leading-relaxed mb-8">
                {hero.subheading ||
                  'Discover top-rated beauty and wellness destinations, pick your favorite stylists, and book appointments in seconds.'}
              </p>

              {/* Quick Hero Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleCtaClick(hero.primaryCtaAction, '/login')}
                  className="px-6 py-3.5 rounded-2xl bg-[#54238f] hover:bg-[#431975] text-white font-semibold text-sm sm:text-base shadow-lg shadow-purple-700/25 hover:shadow-purple-700/40 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span>{hero.primaryCtaText || 'Login as Customer'}</span>
                </button>

                <button
                  onClick={() => handleCtaClick(hero.secondaryCtaAction, '/vendor/login')}
                  className="px-6 py-3.5 rounded-2xl bg-[#810041] hover:bg-[#680034] text-white font-semibold text-sm sm:text-base shadow-lg shadow-rose-900/25 hover:shadow-rose-900/40 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[20px]">storefront</span>
                  <span>{hero.secondaryCtaText || 'Login as Vendor'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── 2. PROMOTIONAL BANNERS CAROUSEL ──────────────────────────── */}
        {isVisible('banners') && banners.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div
              className="relative rounded-3xl overflow-hidden shadow-xl aspect-[21/9] sm:aspect-[24/9] md:aspect-[3/1] bg-slate-900"
              onMouseEnter={() => setBannerPaused(true)}
              onMouseLeave={() => setBannerPaused(false)}
            >
              {banners.map((b, idx) => (
                <div
                  key={b._id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img src={getImageUrl(b.image)} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent flex items-center p-6 sm:p-12">
                    <div className="max-w-lg text-white">
                      {b.subtitle && (
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/80 text-white text-xs font-bold uppercase tracking-wider mb-2">
                          {b.subtitle}
                        </span>
                      )}
                      <h3 className="font-headline text-xl sm:text-3xl font-extrabold mb-2 drop-shadow-md">
                        {b.title}
                      </h3>
                      {b.description && (
                        <p className="text-white/80 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed">
                          {b.description}
                        </p>
                      )}
                      {b.ctaText && (
                        <button
                          onClick={() => handleCtaClick(b.ctaType, b.ctaDestination)}
                          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm hover:bg-slate-100 shadow-md flex items-center gap-1.5 transition-all"
                        >
                          <span>{b.ctaText}</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Navigation Arrows */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={prevBanner}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm z-20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <button
                    onClick={nextBanner}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm z-20 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </>
              )}

              {/* Dots */}
              {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBanner(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentBanner ? 'w-6 bg-white' : 'w-2 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── 3. DUAL ROLE SELECTION CARDS ─────────────────────────────── */}
        {isVisible('roleCards') && (
          <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <div className="text-center mb-10">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-2">
                Choose Your Experience
              </h2>
              <p className="text-2xl sm:text-3xl font-bold text-[#121c2a]">
                How would you like to use our platform?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
              {/* Customer Card */}
              <article className="group relative bg-white rounded-3xl p-7 sm:p-9 border border-purple-100/80 shadow-[0_4px_20px_rgba(84,35,143,0.06)] hover:shadow-[0_16px_36px_rgba(84,35,143,0.14)] hover:border-purple-300 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#54238f] to-[#7031d9] flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[30px]">face_retouching_natural</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-bold uppercase tracking-wider">
                      For Clients
                    </span>
                  </div>

                  <h3 className="font-headline text-2xl font-bold text-[#121c2a] mb-2.5">
                    I&apos;m a Customer
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Find nearby salons, explore service menus, choose staff specialists, and book instant appointments without waiting in line.
                  </p>

                  <ul className="space-y-2.5 mb-8 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span>
                      <span>Browse nearby salons with real-time distance</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span>
                      <span>Choose specific staff specialists for services</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-purple-600 text-[18px]">check_circle</span>
                      <span>Instant atomic slot reservation & confirmation</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <Link
                    to="/login"
                    aria-label="Login as User"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#54238f] hover:bg-[#431975] text-white font-semibold text-sm shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>Login as Customer</span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
                    <Link to="/register" className="hover:text-purple-700 font-medium transition-colors">
                      New customer? <span className="underline font-semibold text-purple-700">Sign Up</span>
                    </Link>
                    <Link to="/salons" className="hover:text-purple-700 font-medium transition-colors flex items-center gap-0.5">
                      <span>Browse as Guest</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    </Link>
                  </div>
                </div>
              </article>

              {/* Vendor Card */}
              <article className="group relative bg-white rounded-3xl p-7 sm:p-9 border border-rose-100/80 shadow-[0_4px_20px_rgba(129,0,65,0.06)] hover:shadow-[0_16px_36px_rgba(129,0,65,0.14)] hover:border-rose-300 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#810041] to-[#b5145b] flex items-center justify-center text-white shadow-md shadow-rose-900/25 group-hover:scale-105 transition-transform duration-300">
                      <span className="material-symbols-outlined text-[30px]">storefront</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[#810041] text-xs font-bold uppercase tracking-wider">
                      For Salon Owners
                    </span>
                  </div>

                  <h3 className="font-headline text-2xl font-bold text-[#121c2a] mb-2.5">
                    I&apos;m a Salon / Vendor
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    Supercharge your salon business. Manage staff rosters, service categories, dynamic pricing, appointments, and live revenue settlements.
                  </p>

                  <ul className="space-y-2.5 mb-8 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#810041] text-[18px]">check_circle</span>
                      <span>Staff scheduling, availability & leave controls</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#810041] text-[18px]">check_circle</span>
                      <span>Multi-service catalog & package creation</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[#810041] text-[18px]">check_circle</span>
                      <span>Live financial reports & cash collection tracking</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  <Link
                    to="/vendor/login"
                    aria-label="Login as Vendor"
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#810041] hover:bg-[#680034] text-white font-semibold text-sm shadow-md shadow-rose-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>Login as Vendor</span>
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Link>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
                    <Link to="/vendor/register" className="hover:text-[#810041] font-medium transition-colors">
                      Want to partner? <span className="underline font-semibold text-[#810041]">Register Salon</span>
                    </Link>
                    <Link to="/vendor/login" className="hover:text-[#810041] font-medium transition-colors flex items-center gap-0.5">
                      <span>Manage Business</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_right_alt</span>
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}

        {/* ─── 4. CATEGORIES SHOWCASE ───────────────────────────────────── */}
        {isVisible('categories') && cmsData?.categories?.length > 0 && (
          <section className="bg-white py-14 px-4 sm:px-6 lg:px-8 border-y border-slate-200/60">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-8">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Popular Categories
                </h2>
                <p className="text-2xl font-headline font-bold text-[#121c2a]">
                  Browse Services by Speciality
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {cmsData.categories.map((c) => (
                  <Link
                    key={c._id}
                    to={`/salons?category=${c._id}`}
                    className="p-4 rounded-2xl bg-[#f9f9ff] border border-slate-100 hover:border-purple-200 hover:shadow-md transition-all text-center flex flex-col items-center group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                      {c.image ? (
                        <img src={getImageUrl(c.image)} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[24px] text-purple-600">spa</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#121c2a] group-hover:text-purple-700 transition-colors">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 5. FEATURES HIGHLIGHTS ────────────────────────────────────── */}
        {isVisible('features') && cmsData?.features?.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h2 className="text-2xl sm:text-3xl font-headline font-bold text-[#121c2a] mb-3">
                  Engineered for Seamless Salon Operations
                </h2>
                <p className="text-slate-600 text-sm sm:text-base">
                  Built to give customers effortless bookings and salon partners complete operational mastery.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cmsData.features.map((f) => (
                  <div key={f._id} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-purple-200 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                      <span className="material-symbols-outlined text-[22px]">{f.icon || 'star'}</span>
                    </div>
                    <h4 className="font-bold text-base text-[#121c2a] mb-1.5">{f.title}</h4>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 6. HOW IT WORKS ──────────────────────────────────────────── */}
        {isVisible('howItWorks') && cmsData?.howItWorks?.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200/70">
            <div className="max-w-5xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-8">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Step-by-Step
                </h2>
                <p className="text-2xl sm:text-3xl font-headline font-bold text-[#121c2a] mb-4">
                  How It Works
                </p>

                {/* Workflow switcher */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                  <button
                    onClick={() => setActiveWorkflowTab('client')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeWorkflowTab === 'client' ? 'bg-[#54238f] text-white shadow-sm' : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    For Customers
                  </button>
                  <button
                    onClick={() => setActiveWorkflowTab('vendor')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeWorkflowTab === 'vendor' ? 'bg-[#810041] text-white shadow-sm' : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    For Salon Owners
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {cmsData.howItWorks
                  .filter((s) => s.targetRole === activeWorkflowTab || s.targetRole === 'all')
                  .map((step, idx) => (
                    <div
                      key={step._id || idx}
                      className="p-6 rounded-2xl bg-[#f9f9ff] border border-slate-100 flex flex-col items-start relative group hover:border-purple-200 transition-all"
                    >
                      <span className="w-10 h-10 rounded-full bg-purple-100 text-[#54238f] font-bold text-sm flex items-center justify-center mb-4">
                        {step.stepNumber || idx + 1}
                      </span>
                      <h4 className="font-bold text-base text-[#121c2a] mb-2">{step.title}</h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 7. GUIDE VIDEOS ──────────────────────────────────────────── */}
        {isVisible('videos') && cmsData?.videos?.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Video Guides
                </h2>
                <p className="text-2xl sm:text-3xl font-headline font-bold text-[#121c2a]">
                  See the Platform in Action
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cmsData.videos.map((vid) => (
                  <div
                    key={vid._id}
                    onClick={() => setActiveVideoModal(vid)}
                    className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md cursor-pointer group transition-all"
                  >
                    <div className="relative h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                      {vid.thumbnail ? (
                        <img
                          src={getImageUrl(vid.thumbnail)}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-purple-950 to-slate-900 flex items-center justify-center" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-[28px] fill-current">play_arrow</span>
                        </div>
                      </div>
                      {vid.duration && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                          {vid.duration}
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block mb-1">
                        {vid.category?.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-[#121c2a] line-clamp-1 mb-1">{vid.title}</h4>
                      {vid.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{vid.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 8. STATISTICS ────────────────────────────────────────────── */}
        {isVisible('stats') && cmsData?.stats?.length > 0 && (
          <section className="bg-gradient-to-r from-[#200547] to-[#450e7b] text-white py-14 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {cmsData.stats.map((st, i) => (
                <div key={st._id || i} className="p-4">
                  <span className="material-symbols-outlined text-3xl text-purple-300 mb-2">{st.icon || 'trending_up'}</span>
                  <div className="text-3xl sm:text-4xl font-extrabold font-headline mb-1 text-white tracking-tight">
                    {st.value}
                  </div>
                  <div className="text-xs sm:text-sm text-purple-200 font-medium">{st.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 9. TESTIMONIALS ──────────────────────────────────────────── */}
        {isVisible('testimonials') && cmsData?.testimonials?.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-10">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Client & Partner Reviews
                </h2>
                <p className="text-2xl sm:text-3xl font-headline font-bold text-[#121c2a]">
                  Loved by Clients, Trusted by Salons
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cmsData.testimonials.map((t) => (
                  <div key={t._id} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex text-amber-400 text-sm mb-4">
                        {Array.from({ length: t.rating || 5 }).map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-[16px] text-amber-400 fill-current">star</span>
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic mb-6">
                        &ldquo;{t.content}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      {t.avatar ? (
                        <img src={getImageUrl(t.avatar)} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                          {t.name?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h5 className="font-bold text-sm text-[#121c2a]">{t.name}</h5>
                        <p className="text-[11px] text-slate-500">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 10. FAQS ACCORDION ───────────────────────────────────────── */}
        {isVisible('faqs') && cmsData?.faqs?.length > 0 && (
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200/70">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-700 mb-1">
                  Questions & Answers
                </h2>
                <p className="text-2xl sm:text-3xl font-headline font-bold text-[#121c2a]">
                  Frequently Asked Questions
                </p>
              </div>

              <div className="space-y-3">
                {cmsData.faqs.map((faq, idx) => (
                  <div key={faq._id || idx} className="rounded-2xl border border-slate-200/80 overflow-hidden transition-all">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-[#121c2a] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <span className="material-symbols-outlined text-[20px] text-purple-700 shrink-0">
                        {activeFaq === idx ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 11. BOTTOM CTA SECTION ───────────────────────────────────── */}
        {isVisible('cta') && (
          <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-tr from-[#54238f] via-[#7031d9] to-[#810041] text-white overflow-hidden text-center">
            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="font-headline text-2xl sm:text-4xl font-extrabold mb-4 drop-shadow">
                {cta.title || 'Ready to Experience Hassle-Free Salon Bookings?'}
              </h2>
              <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
                {cta.description ||
                  'Join thousands of satisfied clients or partner with us to transform your salon operations today.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleCtaClick(cta.primaryButtonAction, '/login')}
                  className="px-6 py-3.5 rounded-2xl bg-white text-purple-900 font-bold text-sm shadow-xl hover:bg-slate-100 transition-all active:scale-[0.98]"
                >
                  {cta.primaryButtonText || 'Book An Appointment'}
                </button>
                <button
                  onClick={() => handleCtaClick(cta.secondaryButtonAction, '/vendor/login')}
                  className="px-6 py-3.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/30 text-white font-bold text-sm hover:bg-black/50 transition-all active:scale-[0.98]"
                >
                  {cta.secondaryButtonText || 'Partner With Us'}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      {isVisible('footer') && (
        <footer className="bg-[#121c2a] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-headline font-bold text-white text-xl tracking-tight mb-1">
                  {appName}
                </span>
                <p className="text-xs text-slate-400 max-w-sm">
                  {footer.description ||
                    'The modern destination for booking salon services, choosing verified staff specialists, and scaling salon businesses.'}
                </p>
              </div>

              {/* Social Channels */}
              <div className="flex items-center gap-3">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-purple-600 text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-purple-600 text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">public</span>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-purple-600 text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">smart_display</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <p>{footer.copyrightText || `© ${new Date().getFullYear()} ${appName}. All rights reserved.`}</p>

              <div className="flex flex-wrap items-center justify-center gap-6">
                <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/help-support" className="hover:text-white transition-colors">Help & Support</Link>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* ─── VIDEO PLAYBACK MODAL ───────────────────────────────────────── */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            className="w-full max-w-3xl bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 text-white">
              <span className="font-bold text-sm">{activeVideoModal.title}</span>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              {activeVideoModal.videoUrl?.includes('youtube.com') || activeVideoModal.videoUrl?.includes('youtu.be') ? (
                <iframe
                  src={
                    activeVideoModal.videoUrl.includes('watch?v=')
                      ? activeVideoModal.videoUrl.replace('watch?v=', 'embed/')
                      : activeVideoModal.videoUrl.includes('youtu.be/')
                      ? activeVideoModal.videoUrl.replace('youtu.be/', 'www.youtube.com/embed/')
                      : activeVideoModal.videoUrl
                  }
                  title={activeVideoModal.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideoModal.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
