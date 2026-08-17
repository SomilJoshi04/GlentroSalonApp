import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getPendingCounts } from '../services/adminApi';

const AdminLayout = () => {
  const { admin: user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState({ vendors: 0, packages: 0, offers: 0, bookings: 0 });

  // Polling for pending counts every 30 seconds
  const fetchPendingCounts = useCallback(async () => {
    try {
      const res = await getPendingCounts();
      if (res.data?.success) {
        setPendingCounts(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch pending counts:", error);
    }
  }, []);

  useEffect(() => {
    fetchPendingCounts();
    const intervalId = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(intervalId);
  }, [fetchPendingCounts]);

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: 'grid_view' },
    { to: '/admin/users', label: 'Users', icon: 'group' },
    { to: '/admin/vendors', label: 'Vendors', icon: 'storefront', count: pendingCounts.vendors },
    { to: '/admin/categories', label: 'Categories', icon: 'category' },
    { to: '/admin/services', label: 'Services', icon: 'cut' },
    { to: '/admin/bookings', label: 'Bookings', icon: 'calendar_today', count: pendingCounts.bookings },
    { to: '/admin/packages', label: 'Packages & Offers', icon: 'redeem', count: pendingCounts.packages + pendingCounts.offers },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: 'workspace_premium' },
    { to: '/admin/coupons', label: 'Coupons', icon: 'local_activity' },
    { to: '/admin/banners', label: 'Banners', icon: 'view_carousel' },
    { to: '/admin/notifications', label: 'Notifications', icon: 'notifications' },
    { to: '/admin/support', label: 'Support', icon: 'headset_mic' },
  ];

  return (
    <div className="min-h-screen bg-background flex font-inter">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-surface border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand/Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px]">spa</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-[18px] text-primary leading-tight">LuxeSalon</h1>
            <p className="font-label-sm text-[11px] text-muted-text">Management Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              end={item.to === '/admin'} 
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center justify-between px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all ${isActive ? 'bg-soft-primary text-primary' : 'text-muted-text hover:bg-surface-variant hover:text-on-surface'}`}
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

        {/* Admin Profile & Logout */}
        <div className="p-4 border-t border-border mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="font-label-md text-[14px] text-on-surface truncate">{user?.name || 'Super Admin'}</p>
              <p className="font-label-sm text-[12px] text-muted-text truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => { logout('admin'); navigate('/admin/login'); }} 
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border h-[72px] px-6 flex items-center justify-between">
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
            <button className="relative p-2 text-muted-text hover:bg-surface-variant rounded-full transition-colors flex items-center">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              {pendingCounts.vendors + pendingCounts.bookings > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface"></span>
              )}
            </button>
            <button className="p-2 text-muted-text hover:bg-surface-variant rounded-full transition-colors flex items-center">
              <span className="material-symbols-outlined text-[24px]">settings</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
               <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                 {user?.name?.charAt(0) || 'A'}
               </div>
               <span className="font-label-md text-[14px] text-on-surface">Admin Profile</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden bg-background">
          <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
