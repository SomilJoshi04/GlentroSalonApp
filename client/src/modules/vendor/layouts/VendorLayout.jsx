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
    { to: '/vendor/packages', label: 'Offers & Packages', icon: 'redeem' },
    { to: '/vendor/reviews', label: 'Reviews', icon: 'star_rate' },
    { to: '/vendor/notifications', label: 'Notifications', icon: 'notifications', count: unreadCount },
    { to: '/vendor/profile', label: 'Profile', icon: 'person' },
  ];

  return (
    <div className="h-screen w-full bg-background flex font-inter overflow-hidden">
      {/* Sidebar */}
      <aside className={`absolute md:relative inset-y-0 left-0 z-50 w-[260px] bg-[#1b0639] border-r border-white/10 transform transition-transform duration-300 flex flex-col h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 shrink-0">
          {settings?.appLogo ? (
            <img src={getImageUrl(settings.appLogo)} alt="App Logo" className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary border border-white/20 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">spa</span>
            </div>
          )}
          <div>
            <h1 className="font-headline-sm text-[18px] text-white leading-tight font-bold tracking-wide">{settings?.appName || 'Glentro Salon'}</h1>
            <p className="font-label-sm text-[11px] text-white/70 tracking-wider">Vendor Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/vendor'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </div>
              {item.count > 0 && (
                <span className="bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                  {item.count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 mt-auto shrink-0">
          <button onClick={() => { logout('vendor'); navigate('/vendor/login'); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium text-white/80 hover:bg-error hover:text-white transition-colors duration-200">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {!hideHeader && (
          <header className="shrink-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border h-[72px] px-4 md:px-6 flex items-center justify-between">
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
        <main className={`flex-1 overflow-y-auto min-h-0 ${hideHeader ? '' : 'p-4 md:p-6 flex flex-col'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
