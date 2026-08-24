import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getVendorAnalytics } from '../services/vendorApi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLORS = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  REJECTED: '#6b7280'
};

const AnalyticsPage = () => {
  const { vendor, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      if (!vendor) return;
      setLoading(true);
      try {
        const res = await getVendorAnalytics({ range });
        if (isMounted && res.data?.success) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.error("Dashboard analytics error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAnalytics();
    return () => { isMounted = false; };
  }, [range, vendor]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
              <span>{entry.name}:</span>
              <span className="font-medium">
                {entry.name && (entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('volume')) ? `₹${entry.value.toLocaleString()}` : entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (authLoading || (loading && !analytics)) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {[1,2,3,4].map(i => <div key={i} className="h-[350px] bg-surface-variant rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">Advanced Analytics</h1>
          <p className="font-body-md text-muted-text mt-1">Deep dive into your business metrics.</p>
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

      {analytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up-fade stagger-1">
            {/* Booking Status */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center">
              <div className="mb-2 w-full">
                <h2 className="font-headline-sm text-[18px] text-on-surface">Booking Status</h2>
                <p className="font-body-sm text-muted-text">Distribution of booking states</p>
              </div>
              <div className="h-[300px] w-full flex justify-center">
                {analytics.bookingStatus?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.bookingStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {analytics.bookingStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-text">No data available</div>
                )}
              </div>
            </div>

            {/* Top Services */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-headline-sm text-[18px] text-on-surface">Top Services</h2>
                <p className="font-body-sm text-muted-text">Most booked services</p>
              </div>
              <div className="h-[300px] w-full">
                {analytics.topServices?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topServices} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} width={120} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="bookings" name="Bookings" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-text">No data available</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-slide-up-fade stagger-2">
            {/* Staff Performance */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="font-headline-sm text-[18px] text-on-surface">Staff Performance</h2>
                <p className="font-body-sm text-muted-text">Completed bookings by staff</p>
              </div>
              <div className="h-[300px] w-full">
                {analytics.staffPerformance?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.staffPerformance} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} width={120} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="bookings" name="Bookings" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-text">No staff data available</div>
                )}
              </div>
            </div>

            {/* Salon Performance */}
            {analytics.salonPerformance?.length > 1 && (
              <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
                <div className="mb-6">
                  <h2 className="font-headline-sm text-[18px] text-on-surface">Salon Comparison</h2>
                  <p className="font-body-sm text-muted-text">Bookings across branches</p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.salonPerformance} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="bookings" name="Bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default AnalyticsPage;
