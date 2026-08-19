import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNearbySalons, getSalons, getCategories, getServices, getBanners } from '../../services/userApi';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { useLocationContext } from '../../../../context/LocationContext';
import LocationSelectionModal from '../../../../components/common/LocationSelectionModal';
import LocationPermissionModal from '../../../../components/common/LocationPermissionModal';
import { getImageUrl } from '../../../../utils/imageUtils';
import { HomeSkeleton } from '../../components/skeletons/HomeSkeleton';
import { useFavorites } from '../../../../context/FavoriteContext';

const HomePage = () => {
  const [salons, setSalons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [salonListTitle, setSalonListTitle] = useState('Nearby Salons');
  const { selectedLocation } = useLocationContext();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const { isFavorite, toggleFavoriteStatus } = useFavorites();

  // Banner Auto-Rotation
  useEffect(() => {
    let interval;
    if (banners.length > 1) {
      interval = setInterval(() => {
        setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [banners.length]);

  // Trigger permission modal on first load if no location exists
  useEffect(() => {
    if (!selectedLocation && !localStorage.getItem('location_prompt_dismissed')) {
      setIsPermissionModalOpen(true);
    }
  }, [selectedLocation]);

  useEffect(() => {
    loadInitialData();
  }, [selectedLocation]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      let salonPromise;
      if (selectedLocation?.lat && selectedLocation?.lng) {
        salonPromise = getNearbySalons({ lat: selectedLocation.lat, lng: selectedLocation.lng, limit: 10 });
        setSalonListTitle('Nearby Salons');
      } else {
        salonPromise = getSalons({ city: selectedLocation?.city, limit: 10 });
        setSalonListTitle('Popular Salons in ' + (selectedLocation?.city || 'Your Area'));
      }

      const [catRes, salonRes, serviceRes, bannerRes] = await Promise.all([
        getCategories(),
        salonPromise,
        getServices({ limit: 4 }),
        getBanners().catch(() => ({ data: { data: [] } }))
      ]);

      setCategories(catRes.data.data?.slice(0, 4) || []);
      setServices(serviceRes.data.data.services || []);
      setBanners(bannerRes.data?.data || []);

      let fetchedSalons = salonRes.data.data.salons || [];

      // Smart Fallback: If nearby search returned 0 salons, fetch popular public salons across India
      if (fetchedSalons.length === 0 && selectedLocation?.lat && selectedLocation?.lng) {
        const publicSalonsRes = await getSalons({ limit: 10 });
        fetchedSalons = publicSalonsRes.data.data.salons || [];
        setSalonListTitle('Popular Salons Across India');
      }

      setSalons(fetchedSalons);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <HomeSkeleton />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const activeOffer = banners.length > 0 ? banners[currentBannerIndex] : null;

  return (
    <div className="bg-[#F8F7F5] text-on-surface font-body-md antialiased pb-4 -mx-4 md:mx-0 md:bg-transparent">
      {/* Hero Section */}
      <div className="relative w-full h-[320px] bg-inverse-surface flex flex-col pt-10 pb-6 px-6 overflow-hidden rounded-b-[24px]">
        {banners.length > 0 ? (
          banners.map((banner, index) => (
            <img
              key={banner._id || index}
              alt={banner.title || "Hero Background"}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out ${index === currentBannerIndex ? 'opacity-50 z-0' : 'opacity-0 -z-10'}`}
              src={getImageUrl(banner.image)}
            />
          ))
        ) : (
          <img
            alt="Hero Background Fallback"
            className="absolute inset-0 w-full h-full object-cover object-top opacity-50 z-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAybZNIjciVynWHUV2jUNo04-Ix6IeHMDVLfbwzBzgmBPN6pXRHRH5Omf2ah_iFmfjvgWxksChx4L6WZpvBDQbKW4b_2PTINUCkMIrGiQgcC9X1N5Qe_us9LrtH_8h6PRDNWYrAVuJ6Y1xoQsR-w5ntVXZOOcTg3PsLHT7teFEQ96wEVmWSzUcyNiz8Cb5Oz9I06pflGf143ZOkVShvvOXMcarRtOiRLyeifYHOXTsXEYSID6XIZAbV"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-[#1A1A1A] z-0"></div>

        {/* Header Nav */}
        <header className="relative z-10 w-full flex justify-between items-center -mt-2.5">
          <div
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-3 py-2 border border-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-white text-[18px]">location_on</span>
            <span className="font-label-sm text-white max-w-[150px] truncate">
              {selectedLocation?.formattedAddress || selectedLocation?.city || 'Select Location'}
            </span>
            <span className="material-symbols-outlined text-white text-[18px]">expand_more</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer" onClick={() => navigate('/notifications')}>
              <span className="material-symbols-outlined text-white text-[24px]">notifications</span>
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-hot-pink rounded-full border border-white/20"></span>}
            </div>

            <div
              onClick={() => navigate('/profile')}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer overflow-hidden"
            >
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-headline-sm text-white">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
          </div>
        </header>

        {/* Greeting & Title */}
        <div className="relative z-10 mt-auto mb-2">
          <p className="font-body-sm text-white/80 mb-0.5">{getGreeting()},</p>
          <h2 className="font-headline-sm text-white mb-2 truncate">{user?.name?.split(' ')[0] || 'Guest'}</h2>
          <h1 className="font-headline-md text-white font-serif tracking-tight leading-[1.15] max-w-[280px]">
            Find & Book The<br />Best Salons Near You
          </h1>
        </div>
      </div>

      {/* Search Bar Area */}
      <div className="px-6 -mt-7 relative z-20">
        <div className="flex gap-3">
          <div
            onClick={() => navigate('/search')}
            className="flex-1 flex items-center bg-surface-container-lowest rounded-2xl px-4 py-3.5 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] border border-border cursor-pointer"
          >
            <span className="material-symbols-outlined text-muted-text mr-3">search</span>
            <input
              readOnly
              className="w-full bg-transparent border-none p-0 focus:ring-0 font-body-sm text-body-sm text-on-surface placeholder-muted-text outline-none cursor-pointer"
              placeholder="Search for salon, service or category"
              type="text"
            />
          </div>
          <button onClick={() => navigate('/search')} className="bg-surface-container-lowest text-heading-text rounded-2xl p-3.5 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] border border-border flex items-center justify-center hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">tune</span>
          </button>
        </div>
      </div>

      <main className="px-6 space-y-10 mt-8">
        {/* Top Categories */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-headline-sm text-headline-sm text-heading-text">Top Categories</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {categories.map(cat => (
              <div
                key={cat._id}
                className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
                onClick={() => navigate(`/search?q=${cat.name}`)}
              >
                <div className="w-[56px] h-[56px] rounded-[16px] bg-[#EDE4FF] flex items-center justify-center text-primary-container shadow-sm hover:bg-primary-fixed transition-colors border border-primary-container/10 overflow-hidden">
                  {cat.image ? (
                    <img src={getImageUrl(cat.image)} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] font-light">{cat.icon || 'category'}</span>
                  )}
                </div>
                <span className="font-label-md text-[11px] text-heading-text font-medium truncate max-w-[56px] text-center">{cat.name}</span>
              </div>
            ))}

            {/* More Button */}
            <div
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
              onClick={() => navigate('/search')}
            >
              <div className="w-[56px] h-[56px] rounded-[16px] bg-surface-container flex items-center justify-center text-muted-text shadow-sm hover:bg-surface-container-high transition-colors border border-border">
                <span className="material-symbols-outlined text-[24px] font-light">grid_view</span>
              </div>
              <span className="font-label-md text-[11px] text-heading-text font-medium text-center">More</span>
            </div>
          </div>
        </section>

        {/* Nearby Salons */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-headline-sm text-headline-sm text-heading-text">{salonListTitle}</h3>
            <button onClick={() => navigate('/salons')} className="font-label-sm text-label-sm text-primary-container hover:text-primary-dark">View all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
            {salons.map(salon => (
              <div
                key={salon._id}
                onClick={() => navigate(`/salon/${salon._id}`)}
                className="shrink-0 w-[240px] bg-surface-container-lowest rounded-[18px] border border-border shadow-[0px_2px_8px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative h-32 w-full">
                  <img
                    alt={salon.name}
                    className="w-full h-full object-cover"
                    src={salon.images?.[0] ? getImageUrl(salon.images[0]) : "https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                  />
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      toggleFavoriteStatus(salon._id); 
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center transition-colors ${
                      isFavorite(salon._id) ? 'text-red-500' : 'text-muted-text hover:text-red-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isFavorite(salon._id) ? "'FILL' 1" : "'FILL' 0", color: isFavorite(salon._id) ? 'red' : 'inherit' }}>
                      favorite
                    </span>
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-headline-sm text-[16px] text-heading-text truncate pr-2">{salon.name}</h4>
                    <div className="flex items-center gap-1 bg-surface-container rounded-md px-1.5 py-0.5 shrink-0">
                      <span className="material-symbols-outlined text-rating text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-label-sm text-label-sm text-muted-text">
                        {salon.ratings?.average > 0 ? salon.ratings.average.toFixed(1) : 'New'}
                      </span>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-muted-text mb-3 flex items-center gap-1 truncate">
                    <span className="material-symbols-outlined text-sm shrink-0">location_on</span>
                    <span className="truncate">{salon.address}</span>
                  </p>
                  <div className="mt-auto border-t border-border/50 pt-3">
                    {salon.minServicePrice !== undefined && salon.minServicePrice !== null ? (
                      <p className="font-label-sm text-label-sm text-primary-container">Starting ₹{salon.minServicePrice}</p>
                    ) : (
                      <p className="font-label-sm text-label-sm text-muted-text">Price unavailable</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Services */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-headline-sm text-headline-sm text-heading-text">Popular Services</h3>
            <button onClick={() => navigate('/search')} className="font-label-sm text-label-sm text-primary-container hover:text-primary-dark">View all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {services.map(service => (
              <div
                key={service._id}
                className="flex flex-col items-center shrink-0 w-[72px] cursor-pointer"
                onClick={() => navigate(`/search?q=${service.name}`)}
              >
                <div className="w-14 h-14 rounded-full bg-soft-primary flex items-center justify-center text-primary mb-2 overflow-hidden">
                  {service.image ? (
                    <img src={getImageUrl(service.image)} alt={service.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined">spa</span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-heading-text text-center line-clamp-1 w-full px-1">{service.name}</span>
                <span className="text-[10px] text-muted-text">₹{service.price}</span>
              </div>
            ))}

            <div
              className="flex flex-col items-center shrink-0 w-[72px] cursor-pointer"
              onClick={() => navigate('/search')}
            >
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-muted-text mb-2">
                <span className="material-symbols-outlined">more_horiz</span>
              </div>
              <span className="text-[11px] font-medium text-heading-text text-center">More</span>
            </div>
          </div>
        </section>

        {/* Exclusive Offers */}
        <section className="pb-4">
          <div 
            onClick={() => activeOffer?.link ? window.open(activeOffer.link, '_blank') : null}
            className={`bg-soft-pink rounded-2xl p-4 flex items-center justify-between border border-hot-pink/10 ${activeOffer?.link ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-hot-pink flex items-center justify-center text-white shrink-0 transform -rotate-45 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">sell</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-heading-text">Exclusive Offers for You!</h4>
                <p className="text-[11px] text-muted-text">Grab amazing deals on top services</p>
              </div>
            </div>
            <button className="bg-hot-pink text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap ml-2">
              View Offers
            </button>
          </div>
        </section>
      </main>

      {/* Location Modals */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false);
          localStorage.setItem('location_prompt_dismissed', 'true');
        }}
        onSelectManually={() => {
          setIsPermissionModalOpen(false);
          localStorage.setItem('location_prompt_dismissed', 'true');
          setIsLocationModalOpen(true);
        }}
      />

      <LocationSelectionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
