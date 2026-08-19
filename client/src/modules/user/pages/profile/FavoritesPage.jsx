import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavoriteSalons } from '../../services/userApi';
import { getImageUrl } from '../../../../utils/imageUtils';
import PageHeader from '../../../../components/common/PageHeader';
import Loader from '../../../../components/common/Loader';

const FavoritesPage = () => {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await getFavoriteSalons();
      setSalons(res.data.data || []);
    } catch (e) {
      console.error('Failed to load favorites', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-background pb-10">
      <PageHeader title="My Favourites" fallbackPath="/profile" />

      <main className="px-4 md:px-margin-desktop py-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-[18px] border border-border shadow-sm overflow-hidden flex flex-col animate-pulse">
                <div className="h-40 w-full bg-surface-variant/60"></div>
                <div className="p-4 flex flex-col flex-1 space-y-3">
                  <div className="h-5 bg-surface-variant/60 rounded w-3/4"></div>
                  <div className="h-4 bg-surface-variant/60 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-[24px] border border-border shadow-sm mt-4 mx-2">
            <span className="material-symbols-outlined text-6xl text-primary/30 mb-4" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
            <h3 className="font-headline-sm text-[20px] font-bold text-on-surface mb-2">No Favourites Yet</h3>
            <p className="font-body-sm text-[14px] text-muted-text max-w-xs mx-auto mb-6">
              You haven't liked any salons yet. Explore salons and tap the heart icon to save them here!
            </p>
            <button 
              onClick={() => navigate('/salons')}
              className="bg-primary text-white font-label-md px-6 py-3 rounded-full hover:bg-primary-dark transition-colors shadow-sm"
            >
              Explore Salons
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
            {salons.map(salon => (
              <div 
                key={salon._id} 
                onClick={() => navigate(`/salon/${salon._id}`)}
                className="bg-surface rounded-[18px] border border-border shadow-sm overflow-hidden flex flex-col cursor-pointer group hover:shadow-md transition-all duration-300 active:scale-[0.98]"
              >
                <div className="h-40 w-full relative overflow-hidden bg-surface-variant">
                  {salon.images?.[0] ? (
                    <img 
                      src={getImageUrl(salon.images[0])} 
                      alt={salon.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">✂️</div>
                  )}
                  {/* Top Right Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {/* Loved Tag */}
                    <div className="bg-error/90 backdrop-blur-sm w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-white text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
                    </div>
                    {/* Rating Badge */}
                    {salon.ratings?.average > 0 && (
                      <div className="bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm h-8">
                        <span className="material-symbols-outlined text-rating text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                        <span className="font-label-sm text-[12px] font-bold text-on-surface">{salon.ratings.average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {/* Gender Tag */}
                  <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center h-8">
                    <span className="font-label-sm text-[10px] uppercase font-bold text-white tracking-wider">{salon.gender}</span>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-headline-sm text-[18px] text-on-surface group-hover:text-primary transition-colors line-clamp-1">{salon.name}</h3>
                  <p className="font-body-sm text-[14px] text-muted-text mt-1 flex items-center gap-1 line-clamp-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {salon.address}
                  </p>
                  
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-border mt-3">
                    <div className="flex items-center gap-1 text-muted-text">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span className="font-body-sm text-[12px]">{salon.openingTime} - {salon.closingTime}</span>
                    </div>
                    <span className="font-label-md text-[14px] text-primary bg-soft-primary px-2 py-1 rounded-lg">{salon.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FavoritesPage;
