import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import api from '../../../services/api/axiosInstance';
import { Skeleton } from '../../../components/common/Skeleton';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';

// ── Status Badge ───────────────────────────────────────────────────────────────
const statusConfig = {
  PENDING:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  PAID:       { label: 'Paid',       cls: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-red-100 text-red-700 border-red-200' },
  FAILED:     { label: 'Failed',     cls: 'bg-red-100 text-red-700 border-red-200' },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Request Withdrawal Modal ───────────────────────────────────────────────────
const WithdrawalModal = ({ availableBalance, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError('Enter a valid amount greater than ₹0'); return; }
    if (val > availableBalance) { setError(`Amount cannot exceed available balance ₹${availableBalance.toLocaleString('en-IN')}`); return; }

    setLoading(true);
    try {
      await api.post('/payments/withdrawal/request', { amountRupees: val });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit withdrawal request');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Request Withdrawal</h3>
            <p className="text-xs text-gray-500 mt-0.5">Funds will be transferred manually by Admin</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        {/* Available Balance */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 mb-5 border border-violet-100">
          <p className="text-xs font-medium text-violet-700 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-violet-900">₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Withdrawal Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={availableBalance}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toFixed(2))}
              className="mt-1.5 text-xs text-violet-600 hover:underline"
            >
              Withdraw full amount
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <strong>Note:</strong> Admin will manually transfer money to your registered bank account/UPI and mark the payout as complete. You can track status in Withdrawal History.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 py-3 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition-colors"
            >
              {loading ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const VendorFinancialPage = () => {
  const { vendor } = useAuth();
  const { selectedSalon, loadingBranches } = useBranch();

  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedLedger, setSelectedLedger] = useState(null);

  // Cash Settlement Modal State
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [customSettleAmount, setCustomSettleAmount] = useState('');
  const [settleAmountError, setSettleAmountError] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [activeTab, setActiveTab] = useState('wallet');

  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [loadingCashStatus, setLoadingCashStatus] = useState(true);
  
  const [cashStatus, setCashStatus] = useState(null);
  const [settlingCash, setSettlingCash] = useState(false);

  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalTotalPages, setWithdrawalTotalPages] = useState(1);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [proofLoading, setProofLoading] = useState({});

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const res = await api.get('/payments/wallet');
      if (res.data?.success) setWallet(res.data.data);
    } catch (e) { console.error('Failed to load wallet', e); }
    setLoadingWallet(false);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const params = {};
      if (selectedSalon) params.salon = selectedSalon._id;
      const res = await api.get('/payments/vendor-financial-summary', { params });
      if (res.data?.success) setSummary(res.data.data);
    } catch (e) { console.error('Failed to load summary', e); }
    setLoadingSummary(false);
  }, [selectedSalon]);

  const loadLedger = useCallback(async (pageNum = 1) => {
    setLoadingLedger(true);
    try {
      const params = { page: pageNum };
      if (selectedSalon) params.salon = selectedSalon._id;
      const res = await api.get('/payments/vendor-ledger', { params });
      if (res.data?.success) {
        setLedger(res.data.data.entries || []);
        setLedgerTotalPages(res.data.data.totalPages || 1);
        setLedgerPage(res.data.data.page || 1);
      }
    } catch (e) { console.error('Failed to load ledger', e); }
    setLoadingLedger(false);
  }, [selectedSalon]);

  const loadWithdrawals = useCallback(async (pageNum = 1) => {
    setLoadingWithdrawals(true);
    try {
      const res = await api.get('/payments/withdrawal/history', { params: { page: pageNum } });
      if (res.data?.success) {
        setWithdrawals(res.data.data.withdrawals || []);
        setWithdrawalTotalPages(res.data.data.totalPages || 1);
        setWithdrawalPage(res.data.data.page || 1);
      }
    } catch (e) { console.error('Failed to load withdrawals', e); }
    setLoadingWithdrawals(false);
  }, []);

  const loadCashStatus = useCallback(async () => {
    setLoadingCashStatus(true);
    try {
      const res = await api.get('/vendor/cash-settlement/status');
      if (res.data?.success) setCashStatus(res.data.data);
    } catch (e) { console.error('Failed to load cash status', e); }
    setLoadingCashStatus(false);
  }, []);

  useEffect(() => {
    if (vendor && !loadingBranches) {
      loadWallet();
      loadSummary();
      loadLedger(1);
      loadWithdrawals(1);
      loadCashStatus();
    }
  }, [vendor, selectedSalon, loadingBranches, loadCashStatus]);

  const handleWithdrawalSuccess = () => {
    setShowWithdrawalModal(false);
    loadWallet();
    loadWithdrawals(1);
  };

  const viewProof = async (withdrawalId) => {
    setProofLoading((p) => ({ ...p, [withdrawalId]: true }));
    try {
      const res = await api.get(`/payments/withdrawal/${withdrawalId}/proof`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      alert('Proof not available or access denied');
    }
    setProofLoading((p) => ({ ...p, [withdrawalId]: false }));
  };

  const handleCashSettlement = async (amountPaise) => {
    try {
      setSettlingCash(true);
      const res = await api.post('/vendor/cash-settlement/create', { amountPaise });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create settlement');

      const { settlementId, razorpayOrderId, amountPaise: finalAmountPaise, currency, keyId } = res.data.data;

      const options = {
        key: keyId,
        amount: finalAmountPaise,
        currency: currency,
        name: 'SalonBook',
        description: 'Vendor Cash Settlement',
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/vendor/cash-settlement/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data?.success) {
              alert('Cash Settlement Successful!');
              loadCashStatus();
              loadLedger(1);
              window.location.reload(); 
            } else {
              alert('Payment verification failed.');
            }
          } catch (err) {
            console.error('Verify err', err);
            alert('Failed to verify payment. Please contact support.');
          }
        },
        prefill: {
          name: vendor?.name || '',
          email: vendor?.email || '',
          contact: vendor?.phone || '',
        },
        theme: { color: '#7c3aed' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to initiate cash settlement');
    } finally {
      setSettlingCash(false);
    }
  };

  const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const fmtPaise = (paise) => `₹${Number((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const entryTypeConfig = {
    ONLINE_RECEIVED:  { label: 'Online Booking Share',      color: 'text-green-600',  bg: 'bg-green-50',  icon: 'payments' },
    CASH_RECEIVED:    { label: 'Cash Collected',            color: 'text-green-600',  bg: 'bg-green-50',  icon: 'money' },
    COMMISSION_DEBIT: { label: 'Commission/Platform Fee',   color: 'text-red-600',    bg: 'bg-red-50',    icon: 'receipt_long' },
    REFUND_REVERSAL:  { label: 'Refund Reversal',           color: 'text-red-600',    bg: 'bg-red-50',    icon: 'undo' },
    SETTLEMENT_CREDIT:{ label: 'Settlement from Admin',     color: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'account_balance' },
    SETTLEMENT_DEBIT: { label: 'Settlement to Admin',       color: 'text-orange-600', bg: 'bg-orange-50', icon: 'account_balance' },
    WALLET_CREDIT:    { label: 'Wallet Credit',             color: 'text-violet-600', bg: 'bg-violet-50', icon: 'account_balance_wallet' },
    PAYOUT_RESERVED:  { label: 'Withdrawal Reserved',       color: 'text-amber-600',  bg: 'bg-amber-50',  icon: 'lock' },
    PAYOUT_COMPLETED: { label: 'Withdrawal Paid',           color: 'text-green-700',  bg: 'bg-green-50',  icon: 'check_circle' },
    PAYOUT_RELEASED:  { label: 'Withdrawal Released',       color: 'text-blue-600',   bg: 'bg-blue-50',   icon: 'lock_open' },
    WALLET_RECOVERY:  { label: 'Recovery Applied',          color: 'text-red-600',    bg: 'bg-red-50',    icon: 'restore' },
  };

  if (loadingBranches) {
    return (
      <VendorPageLayout>
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </VendorPageLayout>
    );
  }

  return (
    <VendorPageLayout>
      <VendorPageHeader
        title="Wallet & Financials"
        description="Track earnings, manage withdrawals, and view transaction history."
      />

      {/* ── Cash Settlement Status ─────────────────────────────────────────────── */}
      {!loadingCashStatus && cashStatus && cashStatus.cashHoldingLimitPaise !== null && (
        <div className={`mb-6 p-5 rounded-2xl border ${cashStatus.cashLimitExceeded ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} shadow-sm`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className={`text-lg font-bold ${cashStatus.cashLimitExceeded ? 'text-red-900' : 'text-gray-900'}`}>
                Cash Holding Status
              </h3>
              <p className={`text-sm ${cashStatus.cashLimitExceeded ? 'text-red-700' : 'text-gray-500'} mt-1`}>
                You have collected {fmtPaise(cashStatus.cashHeldPaise)} out of your {fmtPaise(cashStatus.cashHoldingLimitPaise)} limit.
              </p>
              
              {cashStatus.cashLimitExceeded && (
                <p className="text-sm font-medium text-red-800 mt-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Your account is suspended. Please settle {fmtPaise(cashStatus.excessCashPaise)} to reactivate.
                </p>
              )}
            </div>
            
            {cashStatus.cashHeldPaise > 0 && (
              <button
                onClick={() => {
                  setCustomSettleAmount(cashStatus.excessCashPaise > 0 ? (cashStatus.excessCashPaise / 100).toString() : (cashStatus.cashHeldPaise / 100).toString());
                  setSettleAmountError('');
                  setShowSettleModal(true);
                }}
                disabled={settlingCash}
                className={`whitespace-nowrap px-6 py-2.5 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 ${cashStatus.cashLimitExceeded ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'}`}
              >
                {settlingCash ? 'Processing...' : `Settle Cash`}
              </button>
            )}
          </div>
          
          {cashStatus.cashHoldingLimitPaise > 0 && (
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full ${cashStatus.cashLimitExceeded ? 'bg-red-500' : (cashStatus.cashHeldPaise / cashStatus.cashHoldingLimitPaise > 0.8 ? 'bg-orange-500' : 'bg-green-500')}`}
                style={{ width: `${Math.min(100, (cashStatus.cashHeldPaise / cashStatus.cashHoldingLimitPaise) * 100)}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* ── Wallet Balance Cards ──────────────────────────────────────────────── */}
      {loadingWallet ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : wallet ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {/* Available Balance */}
          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-200">
            <p className="text-sm font-medium text-violet-200">Available Balance</p>
            <h3 className="text-3xl font-bold mt-1">{fmt(wallet.availableBalance)}</h3>
            <button
              onClick={() => setShowWithdrawalModal(true)}
              disabled={!wallet.availableBalance || wallet.availableBalance <= 0}
              className="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Request Withdrawal
            </button>
          </div>

          {/* Pending Balance */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Pending Balance</p>
            <h3 className="text-xl font-bold text-gray-900 mt-1">{fmt(wallet.pendingBalance)}</h3>
            <p className="text-xs text-gray-400 mt-2">Not yet available</p>
          </div>

          {/* Reserved */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm">
            <p className="text-xs font-medium text-amber-700">Reserved (Withdrawal)</p>
            <h3 className="text-xl font-bold text-amber-900 mt-1">{fmt(wallet.reservedBalance)}</h3>
            <p className="text-xs text-amber-600 mt-2">Processing payout</p>
          </div>

          {/* Total Earned */}
          <div className="bg-green-50 rounded-2xl p-5 border border-green-100 shadow-sm">
            <p className="text-xs font-medium text-green-700">Total Earned</p>
            <h3 className="text-xl font-bold text-green-900 mt-1">{fmt(wallet.totalEarned)}</h3>
            <p className="text-xs text-green-600 mt-2">Lifetime</p>
          </div>

          {/* Total Withdrawn */}
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
            <p className="text-xs font-medium text-blue-700">Total Withdrawn</p>
            <h3 className="text-xl font-bold text-blue-900 mt-1">{fmt(wallet.totalWithdrawn)}</h3>
            <p className="text-xs text-blue-600 mt-2">All time</p>
          </div>

          {/* Total Settled to Admin */}
          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 shadow-sm">
            <p className="text-xs font-medium text-orange-700">Total Settled to Admin</p>
            <h3 className="text-xl font-bold text-orange-900 mt-1">{fmt(summary?.settledToAdmin || 0)}</h3>
            <p className="text-xs text-orange-600 mt-2">Cash deposited</p>
          </div>

          {/* Recovery Outstanding */}
          {wallet.recoveryOutstanding > 0 && (
            <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm">
              <p className="text-xs font-medium text-red-700">Recovery Outstanding</p>
              <h3 className="text-xl font-bold text-red-900 mt-1">{fmt(wallet.recoveryOutstanding)}</h3>
              <p className="text-xs text-red-600 mt-2">Pending recovery</p>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Old Financial Summary Cards ──────────────────────────────────────── */}
      {!loadingSummary && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Net Earnings</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.vendorNetEarnings)}</h3>
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">All time net</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Collected (Cash)</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.cashCollected)}</h3>
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">Directly by you</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
            <p className="text-sm font-medium text-blue-800">Admin Owes You</p>
            <h3 className="text-2xl font-bold text-blue-900 mt-1">{fmt(summary.vendorReceivableOutstanding)}</h3>
            <p className="text-xs text-blue-600 mt-3 pt-3 border-t border-blue-100">From online payments</p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 shadow-sm">
            <p className="text-sm font-medium text-orange-800">You Owe Admin</p>
            <h3 className="text-2xl font-bold text-orange-900 mt-1">{fmt(summary.adminReceivableOutstanding)}</h3>
            <p className="text-xs text-orange-600 mt-3 pt-3 border-t border-orange-100">From cash commissions</p>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { id: 'wallet', label: 'Withdrawal History', icon: 'upload' },
            { id: 'ledger', label: 'Ledger History', icon: 'list_alt' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Withdrawal History Tab ─────────────────────────────────────────── */}
        {activeTab === 'wallet' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-5 py-3 border-b border-gray-100">Date</th>
                  <th className="px-5 py-3 border-b border-gray-100">Withdrawal ID</th>
                  <th className="px-5 py-3 border-b border-gray-100 text-right">Amount</th>
                  <th className="px-5 py-3 border-b border-gray-100">Status</th>
                  <th className="px-5 py-3 border-b border-gray-100">Method</th>
                  <th className="px-5 py-3 border-b border-gray-100">UTR</th>
                  <th className="px-5 py-3 border-b border-gray-100">Proof</th>
                  <th className="px-5 py-3 border-b border-gray-100">Rejection Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingWithdrawals ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-10 text-center text-gray-400">
                      <span className="material-symbols-outlined text-4xl block mb-2 text-gray-300">upload</span>
                      No withdrawal requests yet
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {w.withdrawalId?.slice(-10) || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">
                        {fmt(w.amountRupees)}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={w.status} /></td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{w.paymentMethod || '—'}</td>
                      <td className="px-5 py-3">
                        {w.utr ? (
                          <span className="font-mono text-xs text-gray-600">{w.utr}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {w.status === 'PAID' && w.paymentProofFile ? (
                          <button
                            onClick={() => viewProof(w._id)}
                            disabled={proofLoading[w._id]}
                            className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">attach_file</span>
                            {proofLoading[w._id] ? 'Loading...' : 'View'}
                          </button>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-red-600 max-w-[200px] truncate">
                        {w.rejectionReason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {withdrawalTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Page {withdrawalPage} of {withdrawalTotalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => { const p = withdrawalPage - 1; setWithdrawalPage(p); loadWithdrawals(p); }} disabled={withdrawalPage === 1}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => { const p = withdrawalPage + 1; setWithdrawalPage(p); loadWithdrawals(p); }} disabled={withdrawalPage === withdrawalTotalPages}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Ledger History Tab ─────────────────────────────────────────────── */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-5 py-3 border-b border-gray-100 w-40">Date</th>
                  <th className="px-5 py-3 border-b border-gray-100">Transaction</th>
                  <th className="px-5 py-3 border-b border-gray-100">Booking / Ref</th>
                  <th className="px-5 py-3 border-b border-gray-100 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingLedger ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : ledger.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-gray-400">No transactions found</td>
                  </tr>
                ) : (
                  ledger.map((entry) => {
                    const conf = entryTypeConfig[entry.entryType] || { label: entry.entryType, color: 'text-gray-600', bg: 'bg-gray-50', icon: 'swap_horiz' };
                    return (
                      <tr key={entry._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${conf.bg} ${conf.color}`}>
                              <span className="material-symbols-outlined text-[16px]">{conf.icon}</span>
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{conf.label}</p>
                              <p className="text-xs text-gray-500 truncate max-w-xs" title={entry.description}>{entry.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {entry.booking ? (
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                              #{entry.booking._id?.slice(-6).toUpperCase() || entry.booking.toString().slice(-6).toUpperCase()}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={`px-5 py-3 whitespace-nowrap text-right font-medium ${entry.direction === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.direction === 'CREDIT' ? '+' : '-'}{fmt(entry.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {ledgerTotalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Page {ledgerPage} of {ledgerTotalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => { const p = ledgerPage - 1; setLedgerPage(p); loadLedger(p); }} disabled={ledgerPage === 1}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => { const p = ledgerPage + 1; setLedgerPage(p); loadLedger(p); }} disabled={ledgerPage === ledgerTotalPages}
                    className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && wallet && (
        <WithdrawalModal
          availableBalance={wallet.availableBalance}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={handleWithdrawalSuccess}
        />
      )}

      {/* Cash Settlement Modal */}
      {showSettleModal && cashStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Settle Cash Dues</h2>
              <button 
                onClick={() => setShowSettleModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-5">
              <div className="bg-violet-50 rounded-xl p-4 mb-5 text-sm text-violet-900">
                You currently hold <strong>{fmtPaise(cashStatus.cashHeldPaise)}</strong> in physical cash.
                {cashStatus.excessCashPaise > 0 && (
                  <span className="block mt-1 text-red-700">
                    Your limit is exceeded. You must pay at least <strong>{fmtPaise(cashStatus.excessCashPaise)}</strong> to reactivate your account.
                  </span>
                )}
                <span className="block mt-1 text-gray-500">
                  You can choose to pay more to clear your total cash balance completely.
                </span>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount to Settle (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={customSettleAmount}
                    onChange={(e) => {
                      setCustomSettleAmount(e.target.value);
                      setSettleAmountError('');
                    }}
                    className={`w-full pl-8 pr-4 py-3 rounded-xl border ${settleAmountError ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'} outline-none bg-white transition-all`}
                    placeholder="Enter amount"
                  />
                </div>
                {settleAmountError && <p className="text-red-500 text-xs mt-1">{settleAmountError}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const amount = parseFloat(customSettleAmount);
                    if (isNaN(amount) || amount <= 0) {
                      setSettleAmountError('Please enter a valid amount');
                      return;
                    }
                    const amountPaise = Math.round(amount * 100);
                    const minRequired = cashStatus.excessCashPaise > 0 ? cashStatus.excessCashPaise : 0;
                    
                    if (amountPaise < minRequired) {
                      setSettleAmountError(`Minimum amount is ₹${(minRequired / 100).toFixed(2)}`);
                      return;
                    }
                    if (amountPaise > cashStatus.cashHeldPaise) {
                      setSettleAmountError(`Cannot exceed total cash held (₹${(cashStatus.cashHeldPaise / 100).toFixed(2)})`);
                      return;
                    }

                    setShowSettleModal(false);
                    handleCashSettlement(amountPaise);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </VendorPageLayout>
  );
};

export default VendorFinancialPage;
