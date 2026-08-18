import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingContext';
import { useNotifications } from '../../../context/NotificationContext';
import { getImageUrl } from '../../../utils/imageUtils';

const VendorLayout = () => {
  const { vendor: user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hideHeader = location.pathname.includes('/vendor/chat/') || location.pathname.includes('/vendor/booking/');

  const navItems = [
    { to: '/vendor', label: 'Dashboard', icon: 'grid_view' },
    { to: '/vendor/salons', label: 'My Salons', icon: 'store' },
    { to: '/vendor/bookings', label: 'Bookings', icon: 'calendar_today' },
    { to: '/vendor/chats', label: 'Chats', icon: 'chat' },
    { to: '/vendor/staff', label: 'Staff', icon: 'group' },
    { to: '/vendor/services', label: 'Services', icon: 'cut' },
    { to: '/vendor/packages', label: 'Packages', icon: 'redeem' },
    { to: '/vendor/offers', label: 'Offers', icon: 'local_offer' },
    { to: '/vendor/notifications', label: 'Notifications', icon: 'notifications', count: unreadCount },
    { to: '/vendor/profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <div className="min-h-screen bg-background flex font-inter">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-surface border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          {settings?.appLogo ? (
            <img src={`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${settings.appLogo}`} alt="App Logo" className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">spa</span>
            </div>
          )}
          <div>
            <h1 className="font-headline-sm text-[18px] text-primary leading-tight">{settings?.appName || 'LuxeSalon'}</h1>
            <p className="font-label-sm text-[11px] text-muted-text">Vendor Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/vendor'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all ${isActive ? 'bg-soft-primary text-primary' : 'text-muted-text hover:bg-surface-variant hover:text-on-surface'}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </div>
              {item.count > 0 && (
                <span className="bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border mt-auto">
          <button onClick={() => { logout('vendor'); navigate('/vendor/login'); }} 
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium text-error hover:bg-error/10 transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {!hideHeader && (
          <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border h-[72px] px-6 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl text-muted-text hover:bg-surface-variant flex items-center">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div onClick={() => navigate('/vendor/profile')} className="flex items-center gap-3 ml-auto cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-on-surface leading-tight">{user?.businessName || user?.name}</p>
                <p className="text-[10px] text-muted-text uppercase tracking-wider font-semibold mt-0.5">{user?.businessName ? 'Vendor' : 'Owner'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-soft-primary flex items-center justify-center text-primary text-[13px] font-bold shrink-0 overflow-hidden border border-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar.startsWith('data:') ? user.avatar : getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.businessName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'V'
                )}
              </div>
            </div>
          </header>
        )}
        <main className={`flex-1 ${hideHeader ? '' : 'p-6 md:p-8 max-w-[1600px] mx-auto w-full'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
