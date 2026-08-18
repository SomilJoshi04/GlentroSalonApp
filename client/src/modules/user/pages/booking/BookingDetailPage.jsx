import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, cancelBooking } from '../../services/userApi';
import { goBack } from '../../../../utils/navigation';
import Button from '../../../../components/common/Button';
import Loader from '../../../../components/common/Loader';
import Modal from '../../../../components/common/Modal';
import PageHeader from '../../../../components/common/PageHeader';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  REJECTED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { loadBooking(); }, [id]);

  const loadBooking = async () => {
    try {
      const res = await getBookingById(id);
      setBooking(res.data.data.booking);
      setServices(res.data.data.services);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelBooking(id, { reason: cancelReason });
      setCancelModal(false);
      loadBooking();
    } catch (e) {
      alert(e.response?.data?.message || 'Cancellation failed');
    }
    setCancelling(false);
  };

  const handlePayment = async () => {
    try {
      // 1. Create order
      const orderRes = await import('../../services/userApi').then(m => m.createPaymentOrder({ bookingId: id }));
      const order = orderRes.data.data;

      // 2. Initialize Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourTestKey',
        amount: order.amount,
        currency: order.currency,
        name: 'SalonBook',
        description: 'Booking Payment',
        order_id: order.id,
        handler: async function (response) {
          try {
            // 3. Verify payment
            await import('../../services/userApi').then(m => m.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: id
            }));
            alert('Payment successful!');
            loadBooking();
          } catch (e) {
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: booking.user?.name,
          email: booking.user?.email,
          contact: booking.user?.phone
        },
        theme: {
          color: '#14b8a6' // primary-500
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (e) {
      alert(e.response?.data?.message || 'Payment initiation failed');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!booking) return <div className="text-center py-20"><h2>Booking not found</h2></div>;

  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);

  const handleChat = async () => {
    try {
      if (!booking?.salon?.vendor) {
        alert('Vendor information not found for this salon');
        return;
      }
      const { initiateChat } = await import('../../services/userApi');
      const res = await initiateChat({
        recipientId: booking.salon.vendor,
        recipientRole: 'vendor',
        chatType: 'user-vendor',
        salonId: booking.salon._id
      });
      if (res.data.success && res.data.data._id) {
        navigate(`/chat/${res.data.data._id}`);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to initiate chat');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in w-full">
      <PageHeader title="Booking Details" fallbackPath="/bookings" />
      <button onClick={() => goBack(navigate, '/bookings')} className="hidden md:flex items-center gap-2 text-text-secondary hover:text-primary-600 text-sm">
        ← Back to bookings
      </button>

      {/* Status Header */}
      <div className={`rounded-2xl p-6 border-2 ${statusColors[booking.status]} text-center`}>
        <p className="text-sm font-medium mb-1">Booking Status</p>
        <h2 className="text-2xl font-bold">{booking.status}</h2>
        <p className="text-xs mt-1 opacity-80">#{booking._id.slice(-8).toUpperCase()}</p>
      </div>

      {/* Salon Info */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="font-semibold">{booking.salon?.name}</h3>
        <p className="text-sm text-text-secondary mt-1">📍 {booking.salon?.address}</p>
        <p className="text-sm text-text-secondary">📞 {booking.salon?.phone}</p>
      </div>

      {/* Date & Time */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Date</p>
            <p className="font-semibold">{new Date(booking.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-1">Time</p>
            <p className="font-semibold">{booking.startTime} - {booking.endTime}</p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="font-semibold mb-3">Services</h3>
        {services.map(bs => (
          <div key={bs._id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium">{bs.service?.name}</p>
              <p className="text-xs text-text-muted">
                {bs.staff?.name && `👤 ${bs.staff.name} • `}{bs.startTime}-{bs.endTime} • {bs.duration} min
              </p>
            </div>
            <span className="font-medium text-sm">₹{bs.price}</span>
          </div>
        ))}
      </div>

      {/* Payment */}
      <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Payment Summary</h3>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {booking.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-text-secondary">Subtotal</span><span>₹{booking.totalAmount}</span></div>
          {booking.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{booking.discountAmount}</span></div>}
          {booking.cancellationFee > 0 && <div className="flex justify-between text-red-600"><span>Cancellation Fee</span><span>₹{booking.cancellationFee}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary-200"><span>Total</span><span className="text-primary-700">₹{booking.finalAmount}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {booking.paymentStatus !== 'PAID' && canCancel && (
          <Button onClick={handlePayment} className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 text-white">Pay ₹{booking.finalAmount}</Button>
        )}
        {canCancel && <Button variant="danger" onClick={() => setCancelModal(true)} className="flex-1">Cancel Booking</Button>}
        <Button variant="secondary" onClick={handleChat} className="flex-1">Chat</Button>
      </div>

      {/* Cancel Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Booking">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Are you sure you want to cancel this booking? A cancellation fee may apply if less than 60 minutes before the appointment.</p>
          <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Reason for cancellation (optional)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary-400 resize-none" rows={3} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCancelModal(false)} className="flex-1">Keep Booking</Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling} className="flex-1">Confirm Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookingDetailPage;
