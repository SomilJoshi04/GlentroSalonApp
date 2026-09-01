import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { getPendingCounts } from '../services/adminApi';
import NotificationDropdown from '../components/NotificationDropdown';
import { useSettings } from '../../../context/SettingContext';
import { getImageUrl } from '../../../utils/imageUtils';

const AdminLayout = () => {
  const { admin: user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ vendors: 0, packages: 0, offers: 0, bookings: 0 });
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  // Polling for pending counts every 30 seconds
  const { latestNotification } = useNotifications();

  const fetchPendingCounts = useCallback(async () => {
    try {
      const res = await getPendingCounts();
      if (res.data?.success) {
        setPendingCounts(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pending counts:', error);
    }
  }, []);

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCounts]);

  // Refresh pending counts and play sound when a new real-time notification arrives
  useEffect(() => {
    if (latestNotification) {
      fetchPendingCounts();
      
      // Play notification ringtone
      const audio = new Audio('/adminRing.mp3');
      audio.play().catch(error => {
        console.log("Notification sound blocked by browser:", error);
      });
    }
  }, [latestNotification, fetchPendingCounts]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: 'grid_view' },
    { to: '/admin/analytics', label: 'Analytics', icon: 'monitoring' },
    { to: '/admin/users', label: 'Users', icon: 'group' },
    { to: '/admin/vendors', label: 'Vendors', icon: 'storefront', count: pendingCounts.vendors },
    { to: '/admin/vendors/cash-control', label: 'Cash Control', icon: 'account_balance_wallet' },
    { to: '/admin/salons', label: 'Salons', icon: 'store' },
    { to: '/admin/categories', label: 'Categories', icon: 'category' },
    { to: '/admin/services', label: 'Services', icon: 'cut' },
    { to: '/admin/bookings', label: 'Bookings', icon: 'calendar_today' },
    { to: '/admin/packages', label: 'Offers & Packages', icon: 'inventory_2', count: pendingCounts.packages },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: 'workspace_premium' },
    { to: '/admin/reviews', label: 'Reviews', icon: 'star_rate' },
    { to: '/admin/coupons', label: 'Coupons', icon: 'local_activity' },
    { to: '/admin/promotional-videos', label: 'Promotional Videos', icon: 'videocam' },
    { to: '/admin/commissions', label: 'Commissions Config', icon: 'percent' },
    { to: '/admin/payments', label: 'Payments & Revenue', icon: 'account_balance_wallet' },
    { to: '/admin/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/admin/content', label: 'Content (CMS)', icon: 'article' },
    { to: '/admin/settings', label: 'Settings', icon: 'settings' },
    { to: '/admin/support', label: 'Live Support', icon: 'headset_mic' },
    { to: '/admin/booking-issues', label: 'Booking Issues', icon: 'report_problem' },
    { to: '/admin/faqs', label: 'FAQs', icon: 'help_center' },
  ];

  return (
    <div className="h-screen bg-background flex font-inter overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#1b0639] border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand/Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10 shrink-0">
          {settings?.appLogo ? (
            <img src={getImageUrl(settings.appLogo)} alt="App Logo" className="w-10 h-10 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">spa</span>
            </div>
          )}
          <div>
            <h1 className="font-headline-sm text-[18px] text-white leading-tight">{settings?.appName || 'Glentro Salon'}</h1>
            <p className="font-label-sm text-[11px] text-white/70">Management Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              end={item.to === '/admin' || item.to === '/admin/vendors'} 
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${isActive ? 'bg-primary text-white shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
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

        {/* Logout */}
        <div className="p-4 border-t border-white/10 mt-auto shrink-0">
          <button 
            onClick={() => { logout('admin'); navigate('/admin/login'); }} 
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium text-white/80 hover:bg-error hover:text-white transition-colors duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <header className="shrink-0 bg-surface/80 backdrop-blur-md border-b border-border h-[72px] px-6 flex items-center justify-between z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl text-muted-text hover:bg-surface-variant flex items-center">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          
          <div className="flex-1 max-w-xl px-4 hidden md:block">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Search bookings, users, vendors..." 
                className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 pl-10 pr-4 text-[14px] outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <NotificationDropdown />
            <button onClick={() => navigate('/admin/settings')} className="p-2 text-muted-text hover:bg-surface-variant rounded-full transition-colors flex items-center">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </button>
            <NavLink to="/admin/profile" className="hidden sm:flex items-center gap-2 pl-2 border-l border-border hover:bg-surface-variant p-1 pr-3 rounded-full transition-colors">
               {!avatarError && user?.avatar ? (
                 <img 
                   src={user.avatar.startsWith('data:') ? user.avatar : getImageUrl(user.avatar)} 
                   alt="Profile" 
                   onError={() => setAvatarError(true)}
                   className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
                 />
               ) : (
                 <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                   {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                 </div>
               )}
               <span className="font-label-md text-[14px] text-on-surface">{user?.name || 'Admin Profile'}</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background relative">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full min-h-full">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
