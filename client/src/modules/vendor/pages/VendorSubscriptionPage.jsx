import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkSubscription, getSubscriptionPlans, startFreeTrial, createSubscriptionOrder, verifySubscriptionPayment } from '../services/vendorApi';
import { useAuth } from '../../../context/AuthContext';

// Use standard Razorpay checkout
const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const VendorSubscriptionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [status, setStatus] = useState(null); // { status, plan, endDate, graceEnd }
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, plansRes] = await Promise.all([
        checkSubscription(),
        getSubscriptionPlans({ isActive: true })
      ]);
      setStatus(statusRes.data?.data);
      setPlans(plansRes.data?.data || []);
    } catch (err) {
      setError('Failed to load subscription status.');
    }
    setLoading(false);
  };

  const handleStartTrial = async () => {
    setActionLoading(true);
    try {
      await startFreeTrial();
      alert('Free trial started successfully!');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start trial.');
    }
    setActionLoading(false);
  };

  const handleBuyPlan = async (plan) => {
    setActionLoading(true);
    try {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        alert('Razorpay SDK failed to load. Check your connection.');
        setActionLoading(false);
        return;
      }

      const orderRes = await createSubscriptionOrder(plan._id);
      const { orderId, amountPaise, currency } = orderRes.data?.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use Razorpay Key ID from env
        amount: amountPaise,
        currency,
        name: 'Salon Booking Platform',
        description: `Subscription: ${plan.name}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            await verifySubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan._id
            });
            alert('Subscription purchased successfully!');
            loadData();
          } catch (verificationError) {
            alert('Payment verification failed. If money was deducted, it will be refunded automatically.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: {
          color: '#000000'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();

    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate payment.');
    }
    setActionLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-text-secondary">Loading your subscription details...</div>;

  const isCommissionFree = ['TRIAL_ACTIVE', 'PAID_ACTIVE'].includes(status?.status);
  const isGrace = status?.status === 'GRACE_PERIOD';
  const isExpired = status?.status === 'EXPIRED';
  const isNone = status?.status === 'NO_SUBSCRIPTION';

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 shadow-sm border border-border flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface mb-2">My Subscription</h1>
          <p className="text-text-secondary text-base">Manage your billing and choose the best plan for your salon.</p>
        </div>
      </div>

      {error && <div className="p-4 bg-danger/10 text-danger rounded-xl border border-danger/20">{error}</div>}

      {/* Current Status Box */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-sm">
        <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          Current Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            {isNone ? (
              <div className="space-y-4">
                <div className="inline-block px-4 py-2 bg-text-muted/10 text-text-muted rounded-full text-sm font-bold tracking-wide uppercase">No Active Plan</div>
                <p className="text-on-surface">You are currently operating on the default commission model.</p>
                <p className="text-sm text-text-secondary">Purchase a subscription plan to enjoy 0% commission on bookings!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide uppercase ${
                    isCommissionFree ? 'bg-success/10 text-success' :
                    isGrace ? 'bg-warning/10 text-warning' :
                    'bg-error/10 text-error'
                  }`}>
                    {status.status.replace('_', ' ')}
                  </div>
                  <span className="text-xl font-bold text-on-surface">{status.plan?.name || 'Free Trial'}</span>
                </div>
                
                {status.endDate && (
                  <p className="text-on-surface">
                    Expires on: <span className="font-bold">{new Date(status.endDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                )}

                {isCommissionFree ? (
                  <p className="text-sm text-success font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">verified</span> Commission-Free Bookings Active</p>
                ) : isGrace ? (
                  <div className="text-sm text-warning space-y-1">
                    <p className="font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">warning</span> Grace period active until {new Date(status.graceEnd).toLocaleDateString()}</p>
                    <p>New bookings will be charged standard commission. Please renew to restore 0% commission.</p>
                  </div>
                ) : isExpired ? (
                  <div className="text-sm text-error space-y-1">
                    <p className="font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">block</span> Subscription Expired</p>
                    <p>Business actions are limited. Renew your subscription to accept bookings.</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end">
            {isNone && user?.trialUsed !== true && (
              <button 
                onClick={handleStartTrial}
                disabled={actionLoading}
                className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {actionLoading ? 'Activating...' : 'Start 14-Day Free Trial'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold text-on-surface mb-6">Available Plans</h2>
        {plans.length === 0 ? (
          <p className="text-text-muted text-center py-8">No plans are currently available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan._id} className="bg-surface rounded-3xl p-8 border border-border shadow-sm flex flex-col hover:border-primary/50 transition-colors relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>
                
                <h3 className="text-2xl font-bold text-on-surface">{plan.name}</h3>
                
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-primary">₹{plan.price}</span>
                  <span className="text-text-secondary font-medium uppercase tracking-wide text-sm">/ {plan.duration} {plan.durationUnit}</span>
                </div>
                
                <ul className="mt-8 space-y-4 flex-1">
                  <li className="flex items-start gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">check_circle</span>
                    <span>0% Commission on bookings</span>
                  </li>
                  {plan.features?.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-on-surface">
                      <span className="material-symbols-outlined text-[20px] text-primary shrink-0">check_circle</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  onClick={() => handleBuyPlan(plan)}
                  disabled={actionLoading}
                  className="mt-8 w-full py-4 bg-surface-elevated border-2 border-primary/20 text-primary font-bold rounded-xl hover:bg-primary hover:border-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {status?.status === 'PAID_ACTIVE' ? 'Renew / Extend' : 'Subscribe Now'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default VendorSubscriptionPage;
