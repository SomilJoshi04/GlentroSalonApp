import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopStylists } from '../services/staffReviewApi';
import { getImageUrl } from '../../../utils/imageUtils';

/**
 * TopStylists — shows Wilson-score-ranked stylists for a salon.
 *
 * Only staff with at least 1 non-hidden review appear in this section.
 * Staff with 0 reviews appear in the main staff grid with a "New" badge.
 *
 * Used inside SalonDetailPage's Staff tab.
 */
const TopStylists = ({ salonId, salon, staff = [] }) => {
  const navigate = useNavigate();
  const [topStylists, setTopStylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getTopStylists(salonId);
        if (!cancelled) {
          setTopStylists(res.data?.data?.topStylists || []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [salonId]);

  const handleBook = (stylist) => {
    navigate(`/salon/${salonId}/book`, {
      state: {
        salon,
        selectedServices: [],
        staff,
        preselectedStaffId: stylist._id,
      },
    });
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-32 bg-surface-variant rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center gap-2 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-surface-variant" />
              <div className="h-3 w-20 bg-surface-variant rounded" />
              <div className="h-3 w-16 bg-surface-variant rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error or no top stylists: render nothing (let parent show regular staff list)
  if (error || topStylists.length === 0) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mb-6">
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="material-symbols-outlined text-[20px] text-yellow-500"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          workspace_premium
        </span>
        <h3 className="font-headline-sm text-[18px] font-bold text-on-surface">Top Stylists</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {topStylists.map((stylist) => (
          <div
            key={stylist._id}
            className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden mb-3 bg-surface-variant flex items-center justify-center shrink-0 border-2 border-yellow-400/30">
              {stylist.avatar ? (
                <img
                  src={getImageUrl(stylist.avatar)}
                  alt={stylist.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="material-symbols-outlined text-3xl text-primary/50"
                style={{ display: stylist.avatar ? 'none' : 'block' }}
              >
                person
              </span>
            </div>

            {/* Name */}
            <span className="font-label-md text-[14px] font-bold text-on-surface text-center leading-snug">
              {stylist.name}
            </span>

            {/* Specialization */}
            {stylist.specializations?.length > 0 && (
              <span className="font-body-sm text-[11px] text-muted-text mt-0.5 text-center line-clamp-1">
                {stylist.specializations[0]}
              </span>
            )}

            {/* Rating stars + count */}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center text-yellow-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-[12px]"
                    style={{
                      fontVariationSettings:
                        star <= Math.round(stylist.ratings?.average || 0)
                          ? "'FILL' 1"
                          : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-on-surface">
                {stylist.ratings?.average?.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-muted-text">
              {stylist.ratings?.count}{' '}
              {stylist.ratings?.count === 1 ? 'review' : 'reviews'}
            </span>

            {/* Book button */}
            <button
              onClick={() => handleBook(stylist)}
              className="mt-3 w-full bg-primary/10 text-primary hover:bg-primary hover:text-white text-[12px] font-semibold py-1.5 rounded-xl transition-colors"
            >
              Book
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopStylists;
