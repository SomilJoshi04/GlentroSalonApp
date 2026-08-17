import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, acceptBooking, rejectBooking, completeBooking } from '../services/vendorApi';

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);
  const load = async () => { try { const r = await getBookingById(id); setBooking(r.data.data.booking); setServices(r.data.data.services); } catch (e) {} setLoading(false); };

  const handleAction = async (action) => {
    try {
      if (action === 'accept') await acceptBooking(id);
      else if (action === 'reject') await rejectBooking(id, { reason: 'Rejected' });
      else if (action === 'complete') await completeBooking(id);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!booking) return <div className="text-center py-20">Booking not found</div>;

  const statusColors = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800', REJECTED: 'bg-gray-100 text-gray-800' };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-primary">← Back</button>
      <div className={`rounded-2xl p-6 text-center ${statusColors[booking.status]}`}>
        <p className="text-sm font-medium">Status</p>
        <p className="text-2xl font-bold">{booking.status}</p>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
        <h3 className="font-semibold">Customer</h3>
        <p className="text-sm">{booking.user?.name} • {booking.user?.email} • {booking.user?.phone}</p>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
          <div><p className="text-xs text-slate-400">Date</p><p className="font-medium text-sm">{new Date(booking.bookingDate).toLocaleDateString()}</p></div>
          <div><p className="text-xs text-slate-400">Time</p><p className="font-medium text-sm">{booking.startTime} - {booking.endTime}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <h3 className="font-semibold mb-3">Services</h3>
        {services.map(s => <div key={s._id} className="flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm"><span>{s.service?.name} ({s.duration} min)</span><span className="font-medium">₹{s.price}</span></div>)}
        <div className="flex justify-between font-bold mt-3 pt-3 border-t border-slate-200"><span>Total</span><span className="text-primary">₹{booking.finalAmount}</span></div>
      </div>
      {booking.status === 'PENDING' && (
        <div className="flex gap-3"><button onClick={() => handleAction('accept')} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600">Accept</button>
          <button onClick={() => handleAction('reject')} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">Reject</button></div>
      )}
      {booking.status === 'CONFIRMED' && <button onClick={() => handleAction('complete')} className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark">Mark Complete</button>}
    </div>
  );
};
export default BookingDetailPage;
