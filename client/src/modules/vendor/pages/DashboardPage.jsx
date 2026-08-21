import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getVendorSalons, getServices, getSalonStaff, getVendorStats, getVendorRecentBookings, getVendorAnalytics } from '../services/vendorApi';
import { useSocket } from '../../../context/SocketContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  REJECTED: '#6b7280'
};

const DashboardPage = () => {
  const { vendor, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [salons, setSalons] = useState([]);
  
  // KPI Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, todayRevenue: 0, staff: 0, services: 0 });
  const [loading, setLoading] = useState(true);

  // Analytics
  const [analyticsRange, setAnalyticsRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState({
    bookingTrend: [],
    revenueTrend: [],
    bookingStatus: [],
    salonPerformance: [],
    topServices: [],
    staffPerformance: []
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Recent Bookings
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingPagination, setBookingPagination] = useState({ currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => { 
    if (vendor) {
      loadDashboard(); 
    }
  }, [vendor]);

  useEffect(() => {
    if (vendor) {
      fetchAnalytics();
    }
  }, [vendor, analyticsRange]);

  // Handle new bookings via socket
  useEffect(() => {
    if (socket) {
      const handleNewBooking = () => {
        loadDashboard();
        fetchAnalytics();
      };
      socket.on('booking:new', handleNewBooking);
      return () => {
        if (socket.off) socket.off('booking:new', handleNewBooking);
      };
    }
  }, [socket]);

  const fetchBookings = async (page = 1) => {
    setLoadingBookings(true);
    try {
      const res = await getVendorRecentBookings({ page, limit: 5 });
      if (res.data?.success) {
        setRecentBookings(res.data.data);
        setBookingPagination(res.data.pagination);
      }
    } catch (e) {
      console.error('Failed to load recent bookings', e);
    }
    setLoadingBookings(false);
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await getVendorAnalytics({ range: analyticsRange });
      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
    setLoadingAnalytics(false);
  };

  const loadDashboard = async () => {
    try {
      const salonRes = await getVendorSalons();
      const salonList = salonRes.data.data;
      setSalons(salonList);

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

      const [servicesResults, staffResults, statsRes] = await Promise.all([
        Promise.all(servicesPromises),
        Promise.all(staffPromises),
        getVendorStats().catch(() => ({ data: { data: {} } }))
      ]);

      const allServices = servicesResults.flat();
      const allStaff = staffResults.flat();
      const backendStats = statsRes.data?.data || {};

      setStats({
        total: backendStats.totalBookings || 0,
        pending: backendStats.pendingBookings || 0,
        confirmed: backendStats.confirmedBookings || 0,
        completed: backendStats.completedBookings || 0,
        todayRevenue: backendStats.todayRevenue || 0,
        services: allServices.length,
        staff: allStaff.length
      });

      await fetchBookings(1);
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

  const statusColorsList = { 
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
             <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface font-bold">Welcome back, {vendor?.businessName || vendor?.name}!</h1>
          <p className="font-body-md text-muted-text mt-1">Hello, {vendor?.name} • Managing {salons.length} salon{salons.length !== 1 ? 's' : ''}</p>
        </div>
        <select 
          value={analyticsRange}
          onChange={(e) => setAnalyticsRange(e.target.value)}
          className="px-4 py-2 bg-surface border border-border rounded-xl outline-none text-sm font-medium hover:border-primary/50 transition-colors cursor-pointer"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="12m">Last 12 Months</option>
        </select>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`bg-surface rounded-2xl p-6 shadow-sm border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/20 animate-slide-up-fade stagger-${(idx % 8) + 1}`}>
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-headline-lg text-[24px] text-on-surface font-bold">{stat.value}</h3>
              <p className="font-label-md text-muted-text mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Card (Total) */}
      <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/20 flex items-center justify-between animate-slide-up-fade stagger-6">
        <div>
          <p className="font-label-md text-muted-text">Today's Revenue (Completed Bookings)</p>
          <h3 className="font-headline-lg text-[28px] text-success font-bold mt-1">₹{stats.todayRevenue.toLocaleString('en-IN')}</h3>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10 text-success">
          <span className="material-symbols-outlined text-[24px]">payments</span>
        </div>
      </div>

      {/* Analytics Charts */}
      {loadingAnalytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="h-80 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
           <div className="h-80 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
        </div>
      ) : (
        <>
          {/* Main Charts: Trend & Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold text-on-surface text-lg mb-4">Booking Overview</h3>
              <div className="h-72">
                {analyticsData.bookingTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.bookingTrend}>
                      <defs>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" name="Bookings" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-text">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-30">show_chart</span>
                    <p className="text-sm">No booking data available for this period.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold text-on-surface text-lg mb-4">Revenue Overview</h3>
              <div className="h-72">
                {analyticsData.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.revenueTrend}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                      <RechartsTooltip 
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-text">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-30">payments</span>
                    <p className="text-sm">No revenue data available for this period.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Charts: Status & Top Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold text-on-surface text-lg mb-4">Booking Status</h3>
              <div className="h-64 flex items-center justify-center">
                {analyticsData.bookingStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.bookingStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.bookingStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-text">No data</p>
                )}
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold text-on-surface text-lg mb-4">Top Services</h3>
              <div className="h-64">
                {analyticsData.topServices.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.topServices} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#374151'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="bookings" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-sm text-muted-text">No services booked</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tertiary Charts: Staff & Salon Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="font-semibold text-on-surface text-lg mb-4">Staff Performance</h3>
              <div className="h-64">
                {analyticsData.staffPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.staffPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#374151'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="bookings" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={24} name="Completed Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-sm text-muted-text">No staff data</p>
                  </div>
                )}
              </div>
            </div>

            {analyticsData.salonPerformance.length > 1 && (
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="font-semibold text-on-surface text-lg mb-4">Salon Comparison</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.salonPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recent Bookings */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-on-surface text-lg">Recent Bookings & Activities</h3>
        </div>
        {loadingBookings ? (
          <div className="px-6 py-12 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-text flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">calendar_today</span>
            <p className="text-sm">No bookings yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border overflow-hidden">
              {recentBookings.map(b => (
                <div key={b._id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-variant/20 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{b.user?.name || 'Customer'}</p>
                    <p className="text-xs text-muted-text mt-1">
                      {b.salon?.name} • {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {b.startTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm text-on-surface">₹{b.finalAmount}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusColorsList[b.status]}`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {bookingPagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-text">
                  Page {bookingPagination.currentPage} of {bookingPagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={!bookingPagination.hasPreviousPage}
                    onClick={() => fetchBookings(bookingPagination.currentPage - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border disabled:opacity-50 disabled:bg-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={!bookingPagination.hasNextPage}
                    onClick={() => fetchBookings(bookingPagination.currentPage + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border disabled:opacity-50 disabled:bg-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
export default DashboardPage;
