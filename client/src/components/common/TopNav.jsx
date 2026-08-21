import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingContext';
import { useLocationContext } from '../../context/LocationContext';
import { getImageUrl } from '../../utils/imageUtils';
import LocationSelectionModal from './LocationSelectionModal';

const TopNav = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { settings } = useSettings();
  const { selectedLocation } = useLocationContext();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="hidden md:flex fixed top-0 w-full z-50 justify-between items-center px-4 md:px-margin-desktop h-[calc(4.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-[#1b0639] shadow-md box-border">
      <div className="flex items-center gap-4 md:gap-8">
        <div 
          className="cursor-pointer flex items-center"
          onClick={() => navigate('/')}
        >
          {settings?.appLogo ? (
            <img src={getImageUrl(settings.appLogo)} alt={`${settings?.appName || 'Luxe Salon'} Logo`} className="h-8 md:h-10 object-contain" />
          ) : (
            <span className="font-headline-md text-[20px] md:text-[24px] font-bold text-white">{settings?.appName || 'Luxe Salon'}</span>
          )}
        </div>
        
        <div
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center gap-1.5 md:gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-full px-3 py-1.5 md:px-4 md:py-2 border border-white/10 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-white text-[16px] md:text-[18px]">location_on</span>
          <span className="font-label-sm text-white max-w-[100px] sm:max-w-[150px] truncate text-[12px] md:text-[14px]">
            {selectedLocation?.formattedAddress || selectedLocation?.city || 'Select Location'}
          </span>
          <span className="material-symbols-outlined text-white text-[16px] md:text-[18px]">expand_more</span>
        </div>

        <div className="hidden md:flex gap-8 ml-4">
          <NavLink 
            to="/" 
            className={({ isActive }) => `font-label-md transition-all pt-1 ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white pb-[6px]'}`}
          >
            Home
          </NavLink>
          <NavLink 
            to="/search" 
            className={({ isActive }) => `font-label-md transition-all pt-1 ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white pb-[6px]'}`}
          >
            Search
          </NavLink>
          <NavLink 
            to="/offers" 
            className={({ isActive }) => `font-label-md transition-all pt-1 ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white pb-[6px]'}`}
          >
            Offers
          </NavLink>
          <NavLink 
            to="/bookings" 
            className={({ isActive }) => `font-label-md transition-all pt-1 ${isActive ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white pb-[6px]'}`}
          >
            Bookings
          </NavLink>
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        {user ? (
          <>
            <button 
              onClick={() => navigate('/notifications')}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors text-white relative border border-white/10"
            >
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-[#a855f7] text-white text-[10px] font-bold rounded-full px-1 border-2 border-[#1b0639]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/15 transition-colors overflow-hidden border border-white/10"
            >
              {user.avatar ? (
                <img src={`${getImageUrl(user.avatar)}?t=${new Date(user.updatedAt || Date.now()).getTime()}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-headline-sm text-white">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </button>
          </>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-white text-[#1b0639] font-label-md text-[13px] md:text-[14px] rounded-full hover:bg-gray-100 transition-colors"
          >
            Login
          </button>
        )}
      </div>

      <LocationSelectionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </nav>
  );
};

export default TopNav;
