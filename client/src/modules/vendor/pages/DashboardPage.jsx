import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getVendorSalons, getSalonBookings, getServices, getSalonStaff } from '../services/vendorApi';

const DashboardPage = () => {
  const { vendor, loading: authLoading } = useAuth();
  const [salons, setSalons] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0, staff: 0, services: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (vendor) {
      loadDashboard(); 
    }
  }, [vendor]);

  const loadDashboard = async () => {
    try {
      const salonRes = await getVendorSalons();
      const salonList = salonRes.data.data;
      setSalons(salonList);

      // Fetch bookings, services, and staff count in parallel for all salons
      const bookingsPromises = salonList.map(salon => 
        getSalonBookings(salon._id, { limit: 50 })
          .then(res => {
            const bookings = res.data.data.bookings || [];
            // Map bookings with salonName so we know where they belong
            return bookings.map(b => ({ ...b, salonName: salon.name }));
          })
          .catch(() => [])
      );

      const servicesPromises = salonList.map(salon => 
        getServices({ salon: salon._id, isActive: 'all' })
          .then(res => res.data.data.services || [])
          .catch(() => [])
      );

      const staffPromises = salonList.map(salon => 
        getSalonStaff(salon._id)
          .then(res => res.data.data || [])
          .catch(() => [])
      );

      const [bookingsResults, servicesResults, staffResults] = await Promise.all([
        Promise.all(bookingsPromises),
        Promise.all(servicesPromises),
        Promise.all(staffPromises)
      ]);

      const allBookings = bookingsResults.flat();
      const allServices = servicesResults.flat();
      const allStaff = staffResults.flat();

      const pending = allBookings.filter(b => b.status === 'PENDING').length;
      const confirmed = allBookings.filter(b => b.status === 'CONFIRMED').length;
      const completed = allBookings.filter(b => b.status === 'COMPLETED').length;
      const todayRevenue = allBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.finalAmount || 0), 0);

      setStats({
        total: allBookings.length,
        pending,
        confirmed,
        completed,
        todayRevenue,
        services: allServices.length,
        staff: allStaff.length
      });

      setRecentBookings(allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
    } catch (e) {
      console.error('Failed to load dashboard statistics', e);
    }
    setLoading(false);
  };

  const statCards = [
    { label: 'Total Bookings', value: stats.total, icon: 'calendar_month', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pending Bookings', value: stats.pending, icon: 'pending_actions', color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Completed Bookings', value: stats.completed, icon: 'task_alt', color: 'text-success', bg: 'bg-success/10' },
    { label: 'Team Members', value: stats.staff, icon: 'group', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Active Services', value: stats.services, icon: 'cut', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  const statusColors = { 
    PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200', 
    CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200', 
    COMPLETED: 'bg-green-50 text-green-800 border-green-200', 
    CANCELLED: 'bg-red-50 text-red-800 border-red-200', 
    REJECTED: 'bg-gray-50 text-gray-800 border-gray-200' 
  };

  if (loading || authLoading || !vendor) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1,2,3,4,5].map(i => (
             <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse border border-border animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface font-bold">Welcome back, {vendor?.businessName || vendor?.name}!</h1>
        <p className="font-body-md text-muted-text mt-1">Hello, {vendor?.name} • Managing {salons.length} salon{salons.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-surface rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
              </div>
              <span className="material-symbols-outlined text-muted-text/30">trending_up</span>
            </div>
            <div className="mt-4">
              <h3 className="font-headline-lg text-[24px] text-on-surface font-bold">{stat.value}</h3>
              <p className="font-label-md text-muted-text mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Card */}
      <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow flex items-center justify-between">
        <div>
          <p className="font-label-md text-muted-text">Total Revenue (Completed Bookings)</p>
          <h3 className="font-headline-lg text-[28px] text-success font-bold mt-1">₹{stats.todayRevenue.toLocaleString('en-IN')}</h3>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10 text-success">
          <span className="material-symbols-outlined text-[24px]">payments</span>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-on-surface text-lg">Recent Bookings & Activities</h3>
        </div>
        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-text flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">calendar_today</span>
            <p className="text-sm">No bookings yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentBookings.map(b => (
              <div key={b._id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{b.user?.name || 'Customer'}</p>
                  <p className="text-xs text-muted-text mt-1">
                    {b.salonName} • {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {b.startTime}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-sm text-on-surface">₹{b.finalAmount}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColors[b.status]}`}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default DashboardPage;
