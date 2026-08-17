import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVendorSalons, getSalonBookings, acceptBooking, rejectBooking, completeBooking } from '../services/vendorApi';

const statusColors = { PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700', REJECTED: 'bg-gray-100 text-gray-700' };

const BookingManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadSalons(); }, []);
  useEffect(() => { if (selectedSalon) loadBookings(); }, [selectedSalon, filter]);

  const loadSalons = async () => { try { const r = await getVendorSalons(); setSalons(r.data.data); if (r.data.data.length) setSelectedSalon(r.data.data[0]._id); } catch (e) {} setLoading(false); };
  const loadBookings = async () => { try { const params = filter ? { status: filter } : {}; const r = await getSalonBookings(selectedSalon, params); setBookings(r.data.data.bookings); } catch (e) {} };

  const handleAction = async (id, action) => {
    try {
      if (action === 'accept') await acceptBooking(id);
      else if (action === 'reject') await rejectBooking(id, { reason: 'Rejected by vendor' });
      else if (action === 'complete') await completeBooking(id);
      loadBookings();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
          {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div className="flex gap-2 overflow-x-auto">
          {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${filter === f ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? <div className="text-center py-12 bg-white rounded-2xl"><p className="text-slate-400">No bookings found</p></div> : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b._id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="cursor-pointer" onClick={() => navigate(`/booking/${b._id}`)}>
                  <h4 className="font-medium">{b.user?.name || 'Customer'}</h4>
                  <p className="text-sm text-slate-500 mt-1">📅 {new Date(b.bookingDate).toLocaleDateString()} • {b.startTime}-{b.endTime}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{b.user?.email} • {b.user?.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[b.status]}`}>{b.status}</span>
                  <p className="text-sm font-semibold mt-1">₹{b.finalAmount}</p>
                </div>
              </div>
              {b.status === 'PENDING' && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                  <button onClick={() => handleAction(b._id, 'accept')} className="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">Accept</button>
                  <button onClick={() => handleAction(b._id, 'reject')} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">Reject</button>
                </div>
              )}
              {b.status === 'CONFIRMED' && (
                <div className="mt-4 pt-3 border-t border-slate-50">
                  <button onClick={() => handleAction(b._id, 'complete')} className="w-full py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">Mark Complete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default BookingManagePage;
