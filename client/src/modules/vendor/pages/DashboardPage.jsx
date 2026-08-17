import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getVendorSalons, getSalonBookings } from '../services/vendorApi';

const DashboardPage = () => {
  const { user } = useAuth();
  const [salons, setSalons] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const salonRes = await getVendorSalons();
      const salonList = salonRes.data.data;
      setSalons(salonList);

      let allBookings = [];
      for (const salon of salonList.slice(0, 3)) {
        try {
          const bookRes = await getSalonBookings(salon._id, { limit: 10 });
          allBookings = [...allBookings, ...bookRes.data.data.bookings];
        } catch (e) {}
      }

      const pending = allBookings.filter(b => b.status === 'PENDING').length;
      const confirmed = allBookings.filter(b => b.status === 'CONFIRMED').length;
      const completed = allBookings.filter(b => b.status === 'COMPLETED').length;
      const todayRevenue = allBookings.filter(b => b.status === 'COMPLETED').reduce((s, b) => s + (b.finalAmount || 0), 0);

      setStats({ total: allBookings.length, pending, confirmed, completed, todayRevenue });
      setRecentBookings(allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
    } catch (e) {}
    setLoading(false);
  };

  const statCards = [
    { label: 'Total Bookings', value: stats.total, color: 'from-blue-500 to-blue-600', icon: '📅' },
    { label: 'Pending', value: stats.pending, color: 'from-yellow-500 to-orange-500', icon: '⏳' },
    { label: 'Confirmed', value: stats.confirmed, color: 'from-primary-500 to-primary-600', icon: '✅' },
    { label: 'Completed', value: stats.completed, color: 'from-green-500 to-emerald-600', icon: '🎉' },
  ];

  const statusColors = { PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700', REJECTED: 'bg-gray-100 text-gray-700' };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome to {user?.businessName || user?.name}!</h1>
        <p className="text-slate-500 text-sm mt-1">Hello, {user?.name} • {salons.length} salon{salons.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`w-10 h-10 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-white text-lg font-bold`}>
                {s.value}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <p className="text-primary-100 text-sm">Total Revenue (Completed)</p>
        <p className="text-3xl font-bold mt-1">₹{stats.todayRevenue.toLocaleString()}</p>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
        </div>
        {recentBookings.length === 0 ? <p className="px-6 py-8 text-center text-slate-400">No bookings yet</p> : (
          <div className="divide-y divide-slate-50">
            {recentBookings.map(b => (
              <div key={b._id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{b.user?.name || 'Customer'}</p>
                  <p className="text-xs text-slate-400">{new Date(b.bookingDate).toLocaleDateString()} • {b.startTime}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">₹{b.finalAmount}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[b.status]}`}>{b.status}</span>
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
