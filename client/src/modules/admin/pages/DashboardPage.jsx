import { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/adminApi';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await getDashboardStats();
        if (isMounted && res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-headline-md text-[28px] text-on-surface">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
             <div key={i} className="h-[120px] bg-surface-variant rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = data ? [
    { label: 'Total Revenue', value: `₹${(data.totalRevenue || 0).toLocaleString()}`, icon: 'payments', color: 'text-success', bg: 'bg-success/10' },
    { label: 'Platform Fee', value: `₹${(data.totalPlatformFee || 0).toLocaleString()}`, icon: 'account_balance', color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Total Users', value: data.totalUsers || 0, icon: 'group', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Vendors', value: data.activeVendors || 0, icon: 'storefront', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Total Bookings', value: data.totalBookings || 0, icon: 'calendar_month', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Completed Bookings', value: data.completedBookings || 0, icon: 'check_circle', color: 'text-success', bg: 'bg-success/10' },
    { label: 'Pending Bookings', value: data.pendingBookings || 0, icon: 'pending_actions', color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Total Services', value: data.totalServices || 0, icon: 'category', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ] : [];

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface">Dashboard Overview</h1>
        <p className="font-body-md text-muted-text mt-1">Welcome back. Here is what's happening today.</p>
      </div>

      {/* Alerts */}
      {data && (data.pendingVendors > 0 || data.pendingPackages > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.pendingVendors > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
                <span className="material-symbols-outlined text-[20px]">store</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-[16px] text-warning-dark">Pending Vendors</h4>
                <p className="font-body-sm text-warning-dark/80">{data.pendingVendors} vendors awaiting approval.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-surface rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
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
    </div>
  );
};

export default DashboardPage;
