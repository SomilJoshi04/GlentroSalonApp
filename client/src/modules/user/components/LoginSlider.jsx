import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../services/api/axiosInstance';
import { getImageUrl } from '../../../utils/imageUtils';

const AUTOPLAY_INTERVAL = 3500; // ms

/**
 * LoginSlider — displays admin-managed promotional slides on the login page.
 *
 * Behavior:
 * - 0 slides: renders null (no broken UI)
 * - 1 slide: shows slide without arrows/dots
 * - N slides: shows arrows, dots, autoplay
 * - CTA button only shown if both buttonText AND buttonLink exist
 * - buttonLink restricted to https://, http://, or relative /... paths
 * - Image fallback: gradient placeholder on error
 * - Touch swipe support (horizontal delta)
 */
const LoginSlider = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  // Touch tracking
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const timerRef = useRef(null);

  // ── Fetch slides ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get('/login-slides/public');
        if (!cancelled) {
          setSlides(res.data?.data || []);
        }
      } catch {
        if (!cancelled) setSlides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Autoplay ──────────────────────────────────────────────────────────────

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [slides.length, isPaused, next]);

  // ── Touch handlers ────────────────────────────────────────────────────────

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  // Still loading: show skeleton
  if (loading) {
    return (
      <div className="w-full h-full bg-[#2D0B5A]/60 animate-pulse rounded-[32px] flex items-center justify-center">
        <span className="material-symbols-outlined text-white/20 text-[64px]">photo_library</span>
      </div>
    );
  }

  // No slides: render nothing so parent layout is unaffected
  if (!slides || slides.length === 0) return null;

  const slide = slides[current];
  const showNav = slides.length > 1;

  // ── CTA link safety guard ─────────────────────────────────────────────────

  const isSafeLink = (link) => {
    if (!link) return false;
    const lower = link.trim().toLowerCase();
    return lower.startsWith('https://') || lower.startsWith('http://') || lower.startsWith('/');
  };

  const hasValidCTA = slide.buttonText && slide.buttonLink && isSafeLink(slide.buttonLink);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-[32px] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {slides.map((s, idx) => (
        <div
          key={s._id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background image */}
          {!imgErrors[s._id] ? (
            <img
              src={getImageUrl(s.image)}
              alt={s.title || `Slide ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={() => setImgErrors((prev) => ({ ...prev, [s._id]: true }))}
            />
          ) : (
            // Fallback gradient when image fails
            <div className="w-full h-full bg-gradient-to-br from-[#2D0B5A] via-[#5B2D8C] to-[#8854C0]" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Text content */}
          {(s.title || s.description || hasValidCTA) && (
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
              {s.title && (
                <h2 className="text-white font-bold text-[22px] leading-tight mb-1 drop-shadow-lg line-clamp-2">
                  {s.title}
                </h2>
              )}
              {s.description && (
                <p className="text-white/80 text-[14px] leading-relaxed mb-3 line-clamp-2 drop-shadow">
                  {s.description}
                </p>
              )}
              {hasValidCTA && (
                <a
                  href={slide.buttonLink}
                  target={slide.buttonLink.startsWith('/') ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-[#2D0B5A] font-semibold text-[13px] px-5 py-2 rounded-full hover:bg-white/90 active:scale-95 transition-all shadow-lg"
                >
                  {slide.buttonText}
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Navigation Arrows (only when > 1 slide) */}
      {showNav && (
        <>
          <button
            onClick={() => { prev(); setIsPaused(false); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all active:scale-90"
            aria-label="Previous slide"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={() => { next(); setIsPaused(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all active:scale-90"
            aria-label="Next slide"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5 z-30">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrent(idx); setIsPaused(false); }}
                className={`rounded-full transition-all duration-300 ${
                  idx === current
                    ? 'w-5 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Slide count badge (top-right) */}
      {showNav && (
        <div className="absolute top-4 right-4 z-30 bg-black/30 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
          {current + 1} / {slides.length}
        </div>
      )}
    </div>
  );
};

export default LoginSlider;
