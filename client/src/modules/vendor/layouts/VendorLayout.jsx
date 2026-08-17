import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingContext';

const VendorLayout = () => {
  const { vendor: user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/vendor', label: 'Dashboard', icon: '📊' },
    { to: '/vendor/salons', label: 'My Salons', icon: '💈' },
    { to: '/vendor/bookings', label: 'Bookings', icon: '📅' },
    { to: '/vendor/staff', label: 'Staff', icon: '👥' },
    { to: '/vendor/services', label: 'Services', icon: '✂️' },
    { to: '/vendor/packages', label: 'Packages', icon: '📦' },
    { to: '/vendor/offers', label: 'Offers', icon: '🏷️' },
    { to: '/vendor/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface text-on-surface border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
          {settings?.appLogo ? (
            <img src={`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${settings.appLogo}`} alt="App Logo" className="w-10 h-10 rounded-xl shadow-sm object-contain" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-lg text-white">💈</div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">{settings?.appName || 'LuxeSalon'}</h1>
            <p className="text-xs text-slate-500 font-medium">Vendor Portal</p>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/vendor'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-soft-primary text-primary' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
              <span>{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <button onClick={() => { logout('vendor'); navigate('/vendor/login'); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.businessName || user?.name}</p>
              <p className="text-xs text-text-muted">{user?.businessName ? user?.name : 'Vendor'}</p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.businessName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'V'}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
