import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings } from '../../services/userApi';
import Loader from '../../../../components/common/Loader';
import PageHeader from '../../../../components/common/PageHeader';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-gray-100 text-gray-700',
};

const BookingListPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadBookings(); }, [filter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await getMyBookings(params);
      setBookings(res.data.data.bookings);
    } catch (e) {}
    setLoading(false);
  };

  const filters = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <PageHeader title="My Bookings" />
      <h1 className="hidden md:block font-headline-xl text-[32px] font-bold text-on-surface">My Bookings</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[14px] font-label-md whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary text-white shadow-sm' : 'bg-surface text-muted-text border border-border hover:border-primary'}`}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-5 border border-border animate-pulse shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-surface-variant rounded w-48"></div>
                  <div className="h-4 bg-surface-variant rounded w-32"></div>
                </div>
                <div className="h-6 bg-surface-variant rounded-full w-20"></div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="h-4 bg-surface-variant rounded w-24"></div>
                <div className="h-5 bg-surface-variant rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">calendar_month</span>
          <h3 className="text-lg font-semibold">No bookings found</h3>
          <p className="text-text-secondary text-sm mt-1">Book your first appointment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking._id} onClick={() => navigate(`/booking/${booking._id}`)}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-text-primary">{booking.salon?.name || 'Salon'}</h3>
                  <div className="text-sm text-text-secondary mt-1 flex flex-wrap items-center gap-y-1 gap-x-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-muted-text">calendar_month</span>
                      {new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-muted-text">schedule</span>
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[booking.status]}`}>
                  {booking.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-sm text-text-muted">Booking #{booking._id.slice(-6).toUpperCase()}</span>
                <span className="font-semibold text-primary-600">₹{booking.finalAmount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingListPage;
