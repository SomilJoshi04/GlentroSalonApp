import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getAnalytics } from '../services/adminApi';
import { getImageUrl } from '../../../utils/imageUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        if (isMounted && res.data?.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const res = await getAnalytics(range);
        if (isMounted && res.data?.success) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.error("Dashboard analytics error:", err);
      } finally {
        if (isMounted) setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [range]);

  const statCards = stats ? [
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: 'account_balance_wallet', color: 'text-success', bg: 'bg-success/10', path: '/admin/payments' },
    { label: 'Platform Fee Revenue', value: `₹${(stats.totalPlatformFee || 0).toLocaleString()}`, icon: 'percent', color: 'text-blue-500', bg: 'bg-blue-500/10', path: '/admin/payments' },
    { label: 'Admin Commission', value: `₹${(stats.totalCommission || 0).toLocaleString()}`, icon: 'payments', color: 'text-indigo-500', bg: 'bg-indigo-500/10', path: '/admin/payments' },
    { label: 'Total Bookings', value: stats.totalBookings || 0, icon: 'calendar_month', color: 'text-emerald-500', bg: 'bg-emerald-500/10', path: '/admin/bookings' },
    { label: 'Completed Bookings', value: stats.completedBookings || 0, icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10', path: '/admin/bookings' },
    { label: 'Pending Bookings', value: stats.pendingBookings || 0, icon: 'pending_actions', color: 'text-warning', bg: 'bg-warning/10', path: '/admin/bookings' },
    { label: 'Active Vendors', value: stats.activeVendors || 0, icon: 'storefront', color: 'text-purple-500', bg: 'bg-purple-500/10', path: '/admin/vendors' },
    { label: 'Total Users', value: stats.totalUsers || 0, icon: 'group', color: 'text-pink-500', bg: 'bg-pink-500/10', path: '/admin/users' },
  ] : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-medium">
                {entry.name && entry.name.toLowerCase().includes('revenue') ? `₹${entry.value.toLocaleString()}` : entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loadingStats && !stats) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-headline-md text-[28px] text-on-surface">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="h-[120px] bg-surface-variant rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">Dashboard Overview</h1>
          <p className="font-body-md text-muted-text mt-1">Welcome back. Here is what's happening on your platform.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-border shadow-sm overflow-x-auto w-full sm:w-auto">
          {['7d', '30d', '3m', '6m', '12m'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                range === r ? 'bg-primary text-white shadow-md' : 'text-muted-text hover:bg-surface-variant hover:text-on-surface'
              }`}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '3m' ? '3 Months' : r === '6m' ? '6 Months' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {stats && (stats.pendingVendors > 0 || stats.pendingPackages > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up-fade stagger-1">
          {stats.pendingVendors > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
                <span className="material-symbols-outlined text-[20px]">store</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-[16px] text-warning-dark">Pending Vendors</h4>
                <p className="font-body-sm text-warning-dark/80">{stats.pendingVendors} vendors awaiting approval.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, idx) => (
          <div 
            key={idx} 
            onClick={() => stat.path && navigate(stat.path)}
            className={`bg-surface rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 animate-slide-up-fade stagger-${(idx % 6) + 1} ${stat.path ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
              </div>
              <span className="material-symbols-outlined text-muted-text/30">trending_up</span>
            </div>
            <div className="mt-4">
              <h3 className="font-headline-lg text-[24px] text-on-surface">{stat.value}</h3>
              <p className="font-label-md text-muted-text mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      {loadingAnalytics && !analytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {[1,2,3,4].map(i => <div key={i} className="h-[350px] bg-surface-variant rounded-2xl animate-pulse"></div>)}
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-slide-up-fade stagger-2">
            {/* Booking Overview */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-headline-sm text-[18px] text-on-surface">Booking Overview</h2>
                <p className="font-body-sm text-muted-text">Trend of bookings over time</p>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.bookingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" name="Total Bookings" dataKey="totalBookings" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" name="Completed" dataKey="completedBookings" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Overview */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-headline-sm text-[18px] text-on-surface">Revenue Overview</h2>
                <p className="font-body-sm text-muted-text">Platform revenue trend</p>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.revenueOverview} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFee" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" name="Admin Commission" dataKey="adminCommission" stackId="1" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorCommission)" />
                    <Area type="monotone" name="Platform Fee" dataKey="platformFee" stackId="1" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorFee)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </>
      ) : null}

    </div>
  );
};

export default DashboardPage;
