import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createBooking, validateCoupon } from '../../services/userApi';
import { useAuth } from '../../../../context/AuthContext';

const CheckoutPage = () => {
  const { id: salonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Hydrate from state OR sessionStorage
  const [bookingContext] = useState(() => {
    if (location.state?.salon) return location.state;
    const saved = sessionStorage.getItem('pendingBooking');
    return saved ? JSON.parse(saved) : null;
  });

  const salon = bookingContext?.salon;
  const selectedServices = bookingContext?.selectedServices || [];
  const serviceStaff = bookingContext?.serviceStaff || {};
  const date = bookingContext?.date || '';
  const time = bookingContext?.time || '';

  const [couponCode, setCouponCode] = useState(bookingContext?.couponCode || '');
  const [couponResult, setCouponResult] = useState(bookingContext?.couponResult || null);
  const [couponError, setCouponError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Persist current state to sessionStorage so it survives refresh
  useEffect(() => {
    if (salon && date && time && selectedServices.length > 0) {
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        salon, selectedServices, date, time, serviceStaff, couponCode, couponResult
      }));
    }
  }, [salon, selectedServices, date, time, serviceStaff, couponCode, couponResult]);

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const finalAmount = couponResult ? couponResult.finalAmount : totalPrice;

  if (!salon || !date || !time || selectedServices.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-[20px] font-headline-sm text-on-surface mb-2">Incomplete Booking Details</h2>
        <button onClick={() => navigate(`/salon/${salonId}`)} className="text-primary hover:underline">Return to Salon</button>
      </div>
    );
  }

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const res = await validateCoupon({ code: couponCode, amount: totalPrice });
      setCouponResult(res.data.data);
    } catch (e) {
      setCouponError(e.response?.data?.message || 'Invalid coupon');
      setCouponResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      // State is already persisted in sessionStorage by useEffect
      navigate('/login', {
        state: {
          from: location.pathname
        }
      });
      return;
    }

    setSubmitting(true);
    try {
      const bookingData = {
        salon: salonId,
        services: selectedServices.map(s => ({ 
          service: s._id,
          staff: serviceStaff[s._id] || null
        })),
        bookingDate: date,
        startTime: time,
        ...(couponResult && { couponCode }),
      };
      const res = await createBooking(bookingData);
      sessionStorage.removeItem('pendingBooking');
      setSuccess(true);
      setTimeout(() => navigate(`/booking/${res.data.data.booking._id}`), 1500);
    } catch (e) {
      alert(e.response?.data?.message || 'Booking failed');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[40px]">check_circle</span>
        </div>
        <h2 className="text-[24px] font-headline-md text-on-surface mb-2">Booking Confirmed!</h2>
        <p className="text-muted-text font-body-md text-center max-w-sm">
          Your appointment at {salon.name} has been successfully scheduled.
        </p>
      </div>
    );
  }

  const d = new Date(date);
  const dateString = d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="bg-background text-on-surface font-body-md antialiased min-h-screen flex flex-col pb-[120px]">
      {/* Top App Bar */}
      <header className="sticky top-[env(safe-area-inset-top)] w-full z-50 bg-background/90 backdrop-blur-md shadow-sm flex justify-between items-center px-4 md:px-margin-desktop h-16">
        <button onClick={() => navigate(-1)} className="text-on-surface-variant hover:bg-soft-primary p-2 rounded-full transition-colors active:scale-95 duration-150 flex items-center justify-center -ml-2">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-[20px] text-primary text-center absolute left-1/2 -translate-x-1/2">Checkout</h1>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-6 px-4 md:px-margin-desktop w-full max-w-md mx-auto flex flex-col gap-6">
        {/* Salon Summary Card */}
        <section className="bg-surface rounded-[18px] border border-border shadow-sm p-4 flex gap-4 items-center">
          <div className="w-16 h-16 rounded-lg bg-surface-variant flex-shrink-0 overflow-hidden relative">
            <img 
              alt={salon.name} 
              className="object-cover w-full h-full" 
              src={salon.images?.[0] ? `/uploads/${salon.images[0]}` : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80"}
            />
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline-sm text-[18px] text-on-surface mb-1">{salon.name}</h2>
            <div className="flex items-center gap-1 text-muted-text mb-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span className="font-body-sm text-[14px]">{salon.address}</span>
            </div>
          </div>
        </section>

        {/* Appointment Summary */}
        <section className="bg-surface rounded-[18px] border border-border shadow-sm p-5 flex flex-col gap-4">
          <h3 className="font-label-md text-[14px] text-muted-text uppercase tracking-wider">Appointment Summary</h3>
          
          <div className="flex gap-4 mb-2">
            <div className="bg-soft-primary p-3 rounded-lg flex flex-col items-center justify-center min-w-[70px]">
              <span className="font-label-sm text-[12px] text-primary uppercase">{d.toLocaleDateString('en', { month: 'short' })}</span>
              <span className="font-headline-md text-[24px] text-primary">{d.getDate()}</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-headline-sm text-[18px] text-on-surface">{d.toLocaleDateString('en', { weekday: 'long' })}</span>
              <span className="font-body-md text-[16px] text-muted-text">{time}</span>
            </div>
          </div>

          <div className="h-[1px] w-full bg-border"></div>
          
          <div className="flex flex-col gap-3 pt-2">
            {selectedServices.map(s => (
              <div key={s._id} className="flex justify-between items-start">
                <div className="flex flex-col pr-4">
                  <span className="font-body-md text-[16px] font-medium text-on-surface">{s.name}</span>
                  <span className="font-body-sm text-[14px] text-muted-text">{s.duration} min</span>
                </div>
                <span className="font-label-md text-[14px] text-on-surface">₹{s.price}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Coupon Section */}
        <section className="flex gap-3">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text">sell</span>
            <input 
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); setCouponResult(null); }}
              className="w-full pl-10 pr-4 py-3 bg-background-alt border border-border rounded-lg font-body-md text-[16px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
              placeholder="Promo code" 
              type="text"
            />
          </div>
          <button 
            onClick={handleValidateCoupon}
            className="bg-surface-variant text-primary font-label-md text-[14px] px-6 py-3 rounded-lg hover:bg-soft-primary active:scale-95 transition-all"
          >
            Apply
          </button>
        </section>
        {couponError && <p className="text-error text-sm px-1 -mt-4">{couponError}</p>}
        {couponResult && <p className="text-success text-sm px-1 -mt-4 font-medium">✅ Saved ₹{couponResult.discount}</p>}

        {/* Price Breakdown */}
        <section className="bg-surface rounded-[18px] border border-border shadow-sm p-5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-body-md text-[16px] text-muted-text">Subtotal</span>
            <span className="font-body-md text-[16px] text-on-surface">₹{totalPrice}</span>
          </div>
          {couponResult && (
            <div className="flex justify-between items-center text-success">
              <span className="font-body-md text-[16px]">Discount</span>
              <span className="font-body-md text-[16px]">-₹{couponResult.discount}</span>
            </div>
          )}
          <div className="h-[1px] w-full bg-border my-2"></div>
          <div className="flex justify-between items-center">
            <span className="font-headline-sm text-[20px] text-on-surface">Total</span>
            <span className="font-headline-sm text-[20px] text-primary">₹{finalAmount}</span>
          </div>
        </section>
        
        {/* Policy Note */}
        <section className="flex items-start gap-2 bg-inverse-on-surface p-4 rounded-lg">
          <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">info</span>
          <p className="font-body-sm text-[14px] text-on-surface-variant">Pay at the salon after your service is completed. You can cancel your booking anytime.</p>
        </section>
      </main>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full bg-surface shadow-[0px_-10px_20px_rgba(109,62,168,0.08)] px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40 border-t border-border/50">
        <div className="w-full max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-primary text-white font-label-md text-[16px] py-4 rounded-xl shadow-sm hover:bg-primary-dark active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70"
          >
            {submitting ? 'Confirming...' : `Confirm Booking - ₹${finalAmount}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
