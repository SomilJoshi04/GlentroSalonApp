import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, acceptBooking, rejectBooking, completeBooking } from '../services/vendorApi';
import { goBack } from '../../../utils/navigation';

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

  if (loading) {
    return (
      <div className="flex flex-col h-[100dvh] sm:h-full max-w-4xl mx-auto w-full bg-surface border border-border overflow-hidden rounded-2xl">
        <div className="h-16 bg-background-alt animate-pulse border-b border-border" />
        <div className="flex-1 bg-surface-variant/20 p-6 space-y-6">
          <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }
  if (!booking) return <div className="text-center py-20 text-muted-text">Booking not found</div>;

  const statusColors = { 
    PENDING: 'bg-yellow-50 text-yellow-800 border-yellow-200', 
    CONFIRMED: 'bg-blue-50 text-blue-800 border-blue-200', 
    COMPLETED: 'bg-green-50 text-green-800 border-green-200', 
    CANCELLED: 'bg-red-50 text-red-800 border-red-200', 
    REJECTED: 'bg-gray-50 text-gray-800 border-gray-200' 
  };

  const handleChat = async () => {
    try {
      if (!booking?.user?._id) {
        alert('Customer information not found');
        return;
      }
      const { initiateChat } = await import('../services/vendorApi');
      const res = await initiateChat({
        recipientId: booking.user._id,
        recipientRole: 'user',
        chatType: 'user-vendor',
        salonId: booking.salon._id
      });
      if (res.data.success && res.data.data._id) {
        navigate(`/vendor/chat/${res.data.data._id}`);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to initiate chat');
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] sm:min-h-full bg-surface sm:rounded-2xl sm:border border-border max-w-4xl mx-auto w-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-surface sticky top-0 z-10">
        <button onClick={() => goBack(navigate, '/vendor/bookings')} className="p-2 -ml-2 rounded-xl text-on-surface hover:bg-surface-variant transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div>
          <h2 className="font-semibold text-on-surface text-lg">Booking Details</h2>
          <p className="text-xs text-muted-text font-medium">#{booking._id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6 animate-fade-in bg-background-alt/50 pb-10">
        <div className={`rounded-2xl p-6 text-center border ${statusColors[booking.status]}`}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-75">Status</p>
          <p className="text-2xl font-bold mt-1">{booking.status}</p>
        </div>
        
        <div className="bg-surface rounded-2xl p-5 border border-border space-y-4 shadow-sm">
          <h3 className="font-semibold text-on-surface text-base border-b border-border pb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-muted-text">person</span>
            Customer Details
          </h3>
          <div className="text-sm space-y-1.5 text-on-surface">
            <p className="font-semibold text-[15px]">{booking.user?.name}</p>
            <p className="text-muted-text"> {booking.user?.email}</p>
            <p className="text-muted-text"> {booking.user?.phone}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border bg-background-alt/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
            <div>
              <p className="text-xs text-muted-text font-semibold uppercase tracking-wider">Date</p>
              <p className="font-bold text-on-surface text-[15px] mt-1">
                {new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-text font-semibold uppercase tracking-wider">Time Window</p>
              <p className="font-bold text-on-surface text-[15px] mt-1">{booking.startTime} - {booking.endTime}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-semibold text-on-surface text-base border-b border-border pb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-muted-text">content_cut</span>
            Services Catalog
          </h3>
          <div className="divide-y divide-border">
            {services.map(s => (
              <div key={s._id} className="flex justify-between py-3 text-sm text-on-surface">
                <span>{s.service?.name} ({s.duration} min)</span>
                <span className="font-semibold">₹{s.price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-[16px] mt-2 pt-3 border-t border-border">
            <span className="text-on-surface">Grand Total</span>
            <span className="text-primary text-lg">₹{booking.finalAmount}</span>
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <h3 className="font-semibold text-on-surface text-base flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">payments</span>
                Payment Details
              </h3>
              <span className="text-sm text-muted-text mt-1">Method: {['ONLINE', 'online'].includes(booking.paymentMethod) ? 'Online (Razorpay)' : 'Pay at Salon'}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid' ? 'bg-success/20 text-success' : 'bg-yellow-500/20 text-yellow-700'}`}>
              {booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
            </span>
          </div>
          <div className="space-y-2 text-sm text-on-surface pt-3 border-t border-primary/10">
            <div className="flex justify-between"><span className="text-muted-text">Subtotal</span><span className="font-medium">₹{booking.totalAmount}</span></div>
            {booking.discountAmount > 0 && <div className="flex justify-between text-success"><span>Discount (Coupon)</span><span className="font-semibold">-₹{booking.discountAmount}</span></div>}
            <div className="flex justify-between font-bold text-[16px] pt-3 mt-1 border-t border-primary/10">
              <span className="text-on-surface">Final Amount</span>
              <span className="text-primary text-lg">₹{booking.finalAmount}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="font-semibold text-on-surface text-base border-b border-border pb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-muted-text">account_balance_wallet</span>
            Financial Settlement
          </h3>
          <div className="space-y-2 text-sm text-on-surface pt-3">
            <div className="flex justify-between"><span className="text-muted-text">Customer Paid (Final Amount)</span><span className="font-medium">₹{booking.finalAmount}</span></div>
            <div className="flex justify-between text-error"><span className="text-muted-text">Platform Fee ({booking.platformFeePercentage ? booking.platformFeePercentage + '%' : ''})</span><span className="font-semibold">-₹{booking.platformFee || 0}</span></div>
            {booking.vendorPlanType === 'SUBSCRIPTION' ? (
               <div className="flex justify-between text-success"><span className="text-muted-text">Admin Commission (Subscription)</span><span className="font-semibold">-₹0</span></div>
            ) : (
               <div className="flex justify-between text-error"><span className="text-muted-text">Admin Commission ({booking.adminCommissionPercentage ? booking.adminCommissionPercentage + '%' : (booking.commission > 0 ? '' : '0%')})</span><span className="font-semibold">-₹{booking.commission || 0}</span></div>
            )}
            <div className="flex justify-between font-bold text-[16px] pt-3 mt-1 border-t border-border">
              <span className="text-on-surface">Your Net Earning</span>
              <span className="text-success text-lg">₹{booking.vendorPayout || 0}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleChat} className="flex-1 py-3 bg-surface border border-border text-on-surface rounded-xl font-semibold hover:bg-surface-variant transition-colors shadow-sm flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Chat with Customer
          </button>
        </div>

        {booking.status === 'PENDING' && (
          <div className="flex gap-3">
            <button onClick={() => handleAction('accept')} className="flex-1 py-3 bg-success/10 border border-success/30 text-success rounded-xl font-semibold hover:bg-success hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Accept
            </button>
            <button onClick={() => handleAction('reject')} className="flex-1 py-3 bg-error/10 border border-error/30 text-error rounded-xl font-semibold hover:bg-error hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Reject
            </button>
          </div>
        )}
        {booking.status === 'CONFIRMED' && (
          <button onClick={() => handleAction('complete')} className="w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl font-semibold hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
};
export default BookingDetailPage;
