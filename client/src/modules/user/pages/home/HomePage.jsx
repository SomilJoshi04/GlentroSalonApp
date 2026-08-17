import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNearbySalons, getSalons, getCategories, getServices, getBanners } from '../../services/userApi';
import { useAuth } from '../../../../context/AuthContext';
import { useNotifications } from '../../../../context/NotificationContext';
import { useLocationContext } from '../../../../context/LocationContext';
import Loader from '../../../../components/common/Loader';
import LocationSelectionModal from '../../../../components/common/LocationSelectionModal';

const HomePage = () => {
  const [salons, setSalons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [salonListTitle, setSalonListTitle] = useState('Nearby Salons');
  const { selectedLocation } = useLocationContext();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
  }, [selectedLocation]);

  // Auto-swipe banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000); // Swipe every 4 seconds
    return () => clearInterval(interval);
  }, [banners.length]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      let salonPromise;
      if (selectedLocation?.lat && selectedLocation?.lng) {
        salonPromise = getNearbySalons({ lat: selectedLocation.lat, lng: selectedLocation.lng, radius: 50000, limit: 10 });
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

  if (loading) return <Loader text="Loading amazing salons..." />;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="pb-10 pt-4 animate-fade-in space-y-6 box-border w-full">
      {/* Mobile Header */}
      <header className="flex justify-between items-center md:hidden mb-4">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setIsLocationModalOpen(true)}>
          <span className="material-symbols-outlined text-primary" data-icon="location_on" data-weight="fill" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
          <span className="font-label-md text-on-surface max-w-[150px] truncate">{selectedLocation?.formattedAddress || selectedLocation?.city || 'Select Location'}</span>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">expand_more</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => navigate('/notifications')}>
            <span className="material-symbols-outlined text-on-surface text-[28px]">notifications</span>
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-[#E91E63] rounded-full border-2 border-surface"></span>}
          </div>
          <div className="w-9 h-9 rounded-full bg-primary-100 border-2 border-primary-200 overflow-hidden cursor-pointer" onClick={() => navigate('/profile')}>
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold">{user?.name?.charAt(0) || 'U'}</div>
            )}
          </div>
        </div>
      </header>

      {/* Greeting Area */}
      <div>
        <p className="font-body-md text-muted-text mb-1 flex items-center gap-2">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Guest'} <span className="text-xl">👋</span>
        </p>
        <h1 className="font-headline-xl text-[24px] sm:text-[28px] md:text-[36px] leading-tight text-on-surface">
          Find & Book <br />
          The Best <span className="text-primary">Salons</span> Near You
        </h1>
      </div>

      {/* Search Bar */}
      <div 
        className="w-full bg-white border border-border shadow-[0px_2px_8px_rgba(0,0,0,0.04)] rounded-[16px] py-3.5 pl-4 pr-3 flex items-center gap-3 cursor-pointer hover:border-primary-200 transition-colors"
        onClick={() => navigate('/search')}
      >
        <span className="material-symbols-outlined text-outline text-[24px]">search</span>
        <span className="font-body-md text-outline flex-1 truncate">Search for salon, service or category...</span>
        <button className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>
      </div>

      {/* Promo Banners */}
      <div className="w-full rounded-[24px] overflow-hidden relative shadow-[0px_4px_16px_rgba(84,35,143,0.15)] h-40">
        {banners.length > 0 ? (
          <>
            {banners.map((banner, index) => (
              <div 
                key={banner._id || index} 
                className={`absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-1000 ${index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
                onClick={() => banner.link && window.open(banner.link, '_blank')}
              >
                <img 
                  src={`http://localhost:5000/uploads/${banner.image}`} 
                  alt={banner.title || 'Promo Banner'} 
                  className="w-full h-full object-cover object-center" 
                />
                {banner.title && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-5">
                    <h2 className="text-white font-headline-sm text-[20px] leading-tight mb-1">{banner.title}</h2>
                  </div>
                )}
              </div>
            ))}
            {/* Pagination Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-3 right-0 left-0 flex justify-center gap-1.5 z-20">
                {banners.map((_, index) => (
                  <div 
                    key={index} 
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentBannerIndex ? 'w-4 bg-white' : 'w-2 bg-white/40'}`}
                  ></div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 w-full h-full cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Promo" 
              className="w-full h-full object-cover object-center" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent flex flex-col justify-center p-6">
              <h2 className="text-white font-headline-lg text-[28px] leading-tight mb-1">20% OFF</h2>
              <p className="text-white/90 font-body-sm mb-4">On Your First Booking</p>
              <button className="bg-white text-primary font-label-md px-4 py-2 rounded-lg w-max hover:bg-soft-primary transition-colors">
                BOOK NOW
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Categories */}
      <section className="pt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-sm text-on-surface">Top Categories</h2>
          <button onClick={() => navigate('/search')} className="font-label-sm text-primary hover:underline">View all</button>
        </div>
        <div className="flex justify-between px-1">
          {categories.map(cat => (
            <div key={cat._id} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => navigate(`/search?q=${cat.name}`)}>
              <div className="w-14 h-14 bg-soft-primary rounded-2xl flex items-center justify-center text-primary shadow-[0px_2px_8px_rgba(84,35,143,0.05)] border border-primary-100 overflow-hidden">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[28px]">{cat.icon || 'category'}</span>
                )}
              </div>
              <span className="font-label-sm text-on-surface">{cat.name}</span>
            </div>
          ))}
          
          {/* Static More Button */}
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => navigate('/search')}>
            <div className="w-14 h-14 bg-surface-variant rounded-2xl flex items-center justify-center text-on-surface-variant shadow-sm border border-border">
              <span className="material-symbols-outlined text-[28px]">grid_view</span>
            </div>
            <span className="font-label-sm text-on-surface">More</span>
          </div>
        </div>
      </section>

      {/* Salons List */}
      <section className="pt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-sm text-on-surface">{salonListTitle}</h2>
          <button onClick={() => navigate('/salons')} className="font-label-sm text-primary hover:underline">View all</button>
        </div>
        
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x hide-scrollbar">
          {salons.map(salon => (
            <div 
              key={salon._id} 
              onClick={() => navigate(`/salon/${salon._id}`)}
              className="flex-none w-[240px] bg-white rounded-[20px] border border-border shadow-[0px_4px_12px_rgba(0,0,0,0.03)] overflow-hidden snap-start cursor-pointer hover:shadow-[0px_8px_24px_rgba(84,35,143,0.08)] transition-shadow"
            >
              <div className="h-[140px] w-full relative overflow-hidden group">
                <img 
                  src={salon.images?.[0] ? `/uploads/${salon.images[0]}` : "https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                  alt={salon.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-3 right-3 text-white">
                  <span className="material-symbols-outlined" data-icon="favorite_border">favorite_border</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-headline-sm text-[16px] text-on-surface truncate">{salon.name}</h3>
                <p className="font-body-sm text-muted-text truncate mt-0.5">{salon.address}</p>
                <div className="flex items-center gap-3 mt-2 font-label-sm text-muted-text">
                  <span className="flex items-center gap-1 text-on-surface-variant">
                    <span className="text-rating text-[14px]">★</span> {salon.ratings?.average?.toFixed(1) || '4.5'} <span className="font-normal">({salon.ratings?.count || '200'})</span>
                  </span>
                  <span>1.2 km</span>
                </div>
                <div className="mt-2.5 font-label-sm text-primary">
                  Starting ₹299
                </div>
              </div>
            </div>
          ))}
          
          {/* View More Card */}
          <div onClick={() => navigate('/salons')} className="flex-none w-[120px] bg-soft-primary rounded-[20px] flex flex-col items-center justify-center snap-start cursor-pointer hover:bg-primary-100 transition-colors">
            <span className="material-symbols-outlined text-primary text-[32px] mb-2">arrow_forward</span>
            <span className="font-label-sm text-primary">View More</span>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="pt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-headline-sm text-on-surface">Popular Services</h2>
          <button onClick={() => navigate('/search')} className="font-label-sm text-primary hover:underline">View all</button>
        </div>
        <div className="flex justify-between px-1">
          {services.map(service => (
            <div key={service._id} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigate(`/search?q=${service.name}`)}>
              <div className="w-[60px] h-[60px] rounded-full border border-border bg-white flex items-center justify-center text-primary shadow-sm mb-1 hover:border-primary-200 hover:bg-soft-primary transition-colors overflow-hidden">
                {service.image ? (
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[28px]">spa</span>
                )}
              </div>
              <span className="font-label-sm text-[12px] text-on-surface text-center max-w-[70px] truncate">{service.name}</span>
              <span className="font-body-sm text-[11px] text-muted-text">₹{service.price}</span>
            </div>
          ))}

          {/* Static More Button */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigate('/search')}>
            <div className="w-[60px] h-[60px] rounded-full border border-border bg-surface-variant flex items-center justify-center text-on-surface-variant shadow-sm mb-1">
              <span className="material-symbols-outlined text-[28px]">more_horiz</span>
            </div>
            <span className="font-label-sm text-[12px] text-on-surface">More</span>
          </div>
        </div>
      </section>

      {/* Exclusive Offers Banner */}
      <div className="w-full bg-[#fdf2f8] border border-[#fbcfe8] rounded-[16px] p-4 flex items-center justify-between cursor-pointer mb-24">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e11d48] rounded-full flex items-center justify-center text-white transform -rotate-12">
            <span className="material-symbols-outlined text-[20px]">local_offer</span>
          </div>
          <div>
            <h3 className="font-label-md text-on-surface mb-0.5">Exclusive Offers for You!</h3>
            <p className="font-body-sm text-[12px] text-muted-text">Grab amazing deals on top services</p>
          </div>
        </div>
        <button className="bg-[#e11d48] text-white font-label-sm px-4 py-2 rounded-lg hover:bg-[#be123c] transition-colors">
          View Offers
        </button>
      </div>

      {/* Location Modal */}
      <LocationSelectionModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
      />
    </div>
  );
};

export default HomePage;
