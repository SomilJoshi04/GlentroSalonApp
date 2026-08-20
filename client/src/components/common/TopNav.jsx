import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingContext';
import { getImageUrl } from '../../utils/imageUtils';

const TopNav = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { settings } = useSettings();
  const navigate = useNavigate();

  return (
    <nav className="hidden md:flex fixed top-0 w-full z-50 justify-between items-center px-margin-desktop h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-surface shadow-sm box-border">
      <div className="flex items-center gap-8">
        <div 
          className="cursor-pointer flex items-center"
          onClick={() => navigate('/')}
        >
          {settings?.appLogo ? (
            <img src={getImageUrl(settings.appLogo)} alt={`${settings?.appName || 'Luxe Salon'} Logo`} className="h-8 object-contain" />
          ) : (
            <span className="font-headline-md text-[24px] font-bold text-primary">{settings?.appName || 'Luxe Salon'}</span>
          )}
        </div>
        <div className="flex gap-6">
          <NavLink 
            to="/" 
            className={({ isActive }) => `font-label-md transition-colors ${isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Home
          </NavLink>
          <NavLink 
            to="/search" 
            className={({ isActive }) => `font-label-md transition-colors ${isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Search
          </NavLink>
          <NavLink 
            to="/offers" 
            className={({ isActive }) => `font-label-md transition-colors ${isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Offers
          </NavLink>
          <NavLink 
            to="/bookings" 
            className={({ isActive }) => `font-label-md transition-colors ${isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary'}`}
          >
            Bookings
          </NavLink>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <button 
              onClick={() => navigate('/notifications')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>}
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-soft-primary text-primary hover:bg-primary hover:text-on-primary transition-colors overflow-hidden border border-border"
            >
              {user.avatar ? (
                <img src={getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined">person</span>
              )}
            </button>
          </>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-on-primary font-label-md rounded-full hover:bg-primary-dark transition-colors"
          >
            Login / Sign Up
          </button>
        )}
      </div>
    </nav>
  );
};

export default TopNav;
