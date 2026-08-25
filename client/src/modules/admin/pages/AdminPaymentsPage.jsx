import { useState, useEffect, useCallback } from 'react';
import { getAdminTransactions, getAdminFinancialSummary, getAdminSettlements, recordAdminSettlement, getVendors } from '../services/adminApi';
import api from '../../../services/api/axiosInstance';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import { format } from 'date-fns';
import { Skeleton } from '../../../components/common/Skeleton';
import DataTable from '../components/DataTable';
import { formatPaise } from '../../../utils/money';

const wStatusCfg = {
  PENDING:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-100 text-blue-700' },
  PAID:       { label: 'Paid',       cls: 'bg-green-100 text-green-700' },
  REJECTED:   { label: 'Rejected',   cls: 'bg-red-100 text-red-700' },
  FAILED:     { label: 'Failed',     cls: 'bg-red-100 text-red-700' },
  CANCELLED:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-500' },
};
const WBadge = ({ status }) => {
  const c = wStatusCfg[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.cls}`}>{c.label}</span>;
};

const AdminPaymentsPage = () => {
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'settlements' | 'withdrawals'

  // Summary state
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Transactions state
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnFilters, setTxnFilters] = useState({ page: 1, limit: 20, paymentMethod: '', status: '' });
  const [txnPagination, setTxnPagination] = useState({ total: 0, totalPages: 1 });

  // Settlements state
  const [settlements, setSettlements] = useState([]);
  const [loadingSettlements, setLoadingSettlements] = useState(true);
  const [settleFilters, setSettleFilters] = useState({ page: 1, limit: 20, direction: '' });
  const [settlePagination, setSettlePagination] = useState({ total: 0, totalPages: 1 });

  // New settlement modal
  const [showModal, setShowModal] = useState(false);
  const [vendorsList, setVendorsList] = useState([]);
  const [settleForm, setSettleForm] = useState({ vendorId: '', amount: '', method: 'UPI', direction: 'ADMIN_TO_VENDOR', reference: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [wFilters, setWFilters] = useState({ page: 1, limit: 20, status: '' });
  const [wPagination, setWPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [wActionType, setWActionType] = useState(''); // 'process' | 'pay' | 'reject'
  const [wForm, setWForm] = useState({ utr: '', paymentMethod: 'UPI', adminNote: '', rejectionReason: '', proofFile: null });
  const [wSubmitting, setWSubmitting] = useState(false);
  const [wFormError, setWFormError] = useState('');
  const [proofLoading, setProofLoading] = useState({});
  const [viewBankDetails, setViewBankDetails] = useState(null);

  useEffect(() => {
    loadSummary();
    loadVendors();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'settlements') loadSettlements();
    else if (activeTab === 'withdrawals') loadWithdrawals();
  }, [activeTab, txnFilters, settleFilters, wFilters]);

  const loadVendors = async () => {
    try {
      const res = await getVendors({ limit: 1000 });
      if (res.data?.success) setVendorsList(res.data.data);
    } catch (e) {}
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await getAdminFinancialSummary();
      if (res.data?.success) setSummary(res.data.data);
    } catch (e) {}
    setLoadingSummary(false);
  };

  const loadTransactions = async () => {
    setLoadingTxns(true);
    try {
      const res = await getAdminTransactions(txnFilters);
      if (res.data?.success) {
        setTransactions(res.data.data.transactions);
        setTxnPagination({ total: res.data.data.total, totalPages: res.data.data.totalPages });
      }
    } catch (e) {}
    setLoadingTxns(false);
  };

  const loadSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const res = await getAdminSettlements(settleFilters);
      if (res.data?.success) {
        setSettlements(res.data.data.settlements);
        setSettlePagination({ total: res.data.data.total, totalPages: res.data.data.totalPages });
      }
    } catch (e) {}
    setLoadingSettlements(false);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await recordAdminSettlement({ ...settleForm, amount: Number(settleForm.amount) });
      setShowModal(false);
      loadSummary();
      loadSettlements();
      setSettleForm({ vendorId: '', amount: '', method: 'UPI', direction: 'ADMIN_TO_VENDOR', reference: '', notes: '' });
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to record settlement');
    }
    setIsSubmitting(false);
  };

  const loadWithdrawals = async () => {
    setLoadingWithdrawals(true);
    try {
      const res = await api.get('/admin/withdrawals', { params: wFilters });
      if (res.data?.success) {
        setWithdrawals(res.data.data.withdrawals || []);
        setWPagination({ total: res.data.data.total, totalPages: res.data.data.totalPages });
      }
    } catch (e) {}
    setLoadingWithdrawals(false);
  };

  const openWAction = (w, type) => {
    setSelectedWithdrawal(w);
    setWActionType(type);
    setWForm({ utr: '', paymentMethod: 'UPI', adminNote: '', rejectionReason: '', proofFile: null });
    setWFormError('');
  };

  const handleWAction = async (e) => {
    e.preventDefault();
    setWFormError('');
    setWSubmitting(true);
    try {
      if (wActionType === 'process') {
        await api.patch(`/admin/withdrawals/${selectedWithdrawal._id}/process`);
      } else if (wActionType === 'reject') {
        if (!wForm.rejectionReason.trim()) { setWFormError('Rejection reason is required'); setWSubmitting(false); return; }
        await api.patch(`/admin/withdrawals/${selectedWithdrawal._id}/reject`, { rejectionReason: wForm.rejectionReason });
      } else if (wActionType === 'pay') {
        if (!wForm.utr.trim()) { setWFormError('UTR/Reference is required'); setWSubmitting(false); return; }
        if (!wForm.proofFile) { setWFormError('Payment proof file is required'); setWSubmitting(false); return; }
        const fd = new FormData();
        fd.append('utr', wForm.utr.trim());
        fd.append('paymentMethod', wForm.paymentMethod);
        fd.append('adminNote', wForm.adminNote || '');
        fd.append('proofFile', wForm.proofFile);
        await api.post(`/admin/withdrawals/${selectedWithdrawal._id}/pay`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setSelectedWithdrawal(null);
      setWActionType('');
      loadWithdrawals();
    } catch (err) {
      setWFormError(err.response?.data?.message || 'Action failed');
    }
    setWSubmitting(false);
  };

  const viewProof = async (w) => {
    setProofLoading(p => ({ ...p, [w._id]: true }));
    try {
      const res = await api.get(`/payments/withdrawal/${w._id}/proof`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { alert('Proof not available'); }
    setProofLoading(p => ({ ...p, [w._id]: false }));
  };

  const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const txnColumns = [
    { key: 'date', label: 'Date', render: (row) => format(new Date(row.createdAt), 'dd MMM yyyy HH:mm') },
    { key: 'booking', label: 'Booking ID', render: (row) => <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded">#{row.booking?._id?.slice(-6).toUpperCase() || 'N/A'}</span> },
    { key: 'vendor', label: 'Vendor / Salon', render: (row) => (
      <div>
        <p className="font-medium text-text-primary">{row.vendor?.businessName || row.vendor?.name || 'N/A'}</p>
        <p className="text-xs text-text-muted">{row.salon?.name}</p>
      </div>
    )},
    { key: 'type', label: 'Type / Method', render: (row) => (
      <div>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.transactionType === 'PAYMENT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {row.transactionType}
        </span>
        <p className="text-xs text-text-muted mt-1">{row.paymentMethod}</p>
      </div>
    )},
    { key: 'amount', label: 'Amount Breakdown', render: (row) => (
      <div className="text-sm">
        <div className="flex justify-between gap-4"><span className="text-text-muted">Gross:</span> <span className="font-medium">{formatPaise(row.amountPaise, row.amount)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-text-muted">Admin:</span> <span className="text-primary-700 font-medium">{formatPaise(row.pricing?.adminRevenuePaise, row.pricing?.adminRevenue)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-text-muted">Vendor:</span> <span className="text-green-700 font-medium">{formatPaise(row.pricing?.vendorNetAmountPaise, row.pricing?.vendorNetAmount)}</span></div>
      </div>
    )}
  ];

  const settleColumns = [
    { key: 'date', label: 'Date', render: (row) => format(new Date(row.createdAt), 'dd MMM yyyy HH:mm') },
    { key: 'vendor', label: 'Vendor', render: (row) => <span className="font-medium">{row.vendor?.businessName || row.vendor?.name}</span> },
    { key: 'direction', label: 'Direction', render: (row) => (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.direction === 'ADMIN_TO_VENDOR' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
        {row.direction === 'ADMIN_TO_VENDOR' ? 'Paid to Vendor' : 'Received from Vendor'}
      </span>
    )},
    { key: 'amount', label: 'Amount', render: (row) => <span className="font-bold">{formatPaise(row.amountPaise, row.amount)}</span> },
    { key: 'method', label: 'Method & Ref', render: (row) => (
      <div>
        <p className="font-medium">{row.method}</p>
        <p className="text-xs text-text-muted font-mono">{row.reference || 'No ref'}</p>
      </div>
    )},
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Financials & Payments" 
        subtitle="Manage transactions, revenue, and vendor settlements" 
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {loadingSummary ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : summary && (
          <>
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20">
              <p className="text-sm font-medium text-primary-800">Net Admin Revenue</p>
              <h3 className="text-2xl font-bold text-primary-900 mt-1">{formatPaise(summary.netAdminRevenuePaise, summary.netAdminRevenue)}</h3>
              <p className="text-xs text-primary-600 mt-2">Commission + Platform Fees - Refunds</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Gross Online Collections</p>
              <h3 className="text-2xl font-bold text-text-primary mt-1">{formatPaise(summary.onlinePayments?.grossCollectionPaise, summary.onlinePayments?.grossCollection)}</h3>
              <p className="text-xs text-text-muted mt-2">Razorpay total volume</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Total Settled to Vendors</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">{formatPaise(summary.settlements?.totalSettledToVendorsPaise, summary.settlements?.totalSettledToVendors)}</h3>
              <p className="text-xs text-text-muted mt-2">Admin → Vendor transfers</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Total Received from Vendors</p>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">{formatPaise(summary.settlements?.totalReceivedFromVendorsPaise, summary.settlements?.totalReceivedFromVendors)}</h3>
              <p className="text-xs text-text-muted mt-2">Vendor → Admin transfers</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
              <p className="text-sm font-medium text-text-secondary">Total Processed Refunds</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{formatPaise(summary.refunds?.totalRefundedPaise, summary.refunds?.totalRefunded)}</h3>
              <p className="text-xs text-text-muted mt-2">Refunded to customers</p>
            </div>
          </>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'transactions' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted hover:text-text-primary hover:bg-surface-variant'}`}
          >
            All Transactions
          </button>
          <button 
            onClick={() => setActiveTab('settlements')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'settlements' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted hover:text-text-primary hover:bg-surface-variant'}`}
          >
            Vendor Settlements
          </button>
          <button 
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === 'withdrawals' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-text-muted hover:text-text-primary hover:bg-surface-variant'}`}
          >
            Vendor Withdrawals
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 flex flex-col">
          {activeTab === 'transactions' && (
            <>
              <div className="flex gap-4 mb-4">
                <select 
                  className="bg-background border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  value={txnFilters.paymentMethod}
                  onChange={(e) => setTxnFilters(prev => ({ ...prev, paymentMethod: e.target.value, page: 1 }))}
                >
                  <option value="">All Methods</option>
                  <option value="ONLINE">Online</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <DataTable 
                columns={txnColumns} 
                data={transactions} 
                loading={loadingTxns}
                emptyMessage="No transactions found."
              />
              {/* Simple Pagination */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="text-sm text-text-muted">Page {txnFilters.page} of {txnPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={txnFilters.page === 1} onClick={() => setTxnFilters(prev => ({ ...prev, page: prev.page - 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">Prev</button>
                  <button disabled={txnFilters.page === txnPagination.totalPages} onClick={() => setTxnFilters(prev => ({ ...prev, page: prev.page + 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'settlements' && (
            <>
              <div className="flex justify-between items-center mb-4 gap-4">
                <select 
                  className="bg-background border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
                  value={settleFilters.direction}
                  onChange={(e) => setSettleFilters(prev => ({ ...prev, direction: e.target.value, page: 1 }))}
                >
                  <option value="">All Directions</option>
                  <option value="ADMIN_TO_VENDOR">Paid to Vendor</option>
                  <option value="VENDOR_TO_ADMIN">Received from Vendor</option>
                </select>
                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Record Settlement
                </button>
              </div>
              <DataTable 
                columns={settleColumns} 
                data={settlements} 
                loading={loadingSettlements}
                emptyMessage="No settlements recorded yet."
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="text-sm text-text-muted">Page {settleFilters.page} of {settlePagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={settleFilters.page === 1} onClick={() => setSettleFilters(prev => ({ ...prev, page: prev.page - 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">Prev</button>
                  <button disabled={settleFilters.page === settlePagination.totalPages || settlePagination.totalPages === 0} onClick={() => setSettleFilters(prev => ({ ...prev, page: prev.page + 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors">Next</button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'withdrawals' && (
            <>
              <div className="flex gap-4 mb-4">
                <select className="bg-background border border-border rounded-xl px-4 py-2 text-sm" value={wFilters.status} onChange={(e) => setWFilters(p => ({ ...p, status: e.target.value, page: 1 }))}>
                  <option value="">All Statuses</option>
                  {['PENDING','PROCESSING','PAID','REJECTED','FAILED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3">Withdrawal ID</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">UTR</th>
                      <th className="px-4 py-3">Proof</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingWithdrawals ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>)}
                        </tr>
                      ))
                    ) : withdrawals.length === 0 ? (
                      <tr><td colSpan="8" className="px-4 py-10 text-center text-gray-400">No withdrawal requests found</td></tr>
                    ) : withdrawals.map((w) => (
                      <tr key={w._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{w.vendor?.businessName || w.vendor?.name}</p>
                          <p className="text-xs text-gray-500">{w.vendor?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{w.withdrawalId?.slice(-10)}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatPaise(w.amountPaise, w.amountRupees)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-3"><WBadge status={w.status} /></td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{w.utr || '—'}</td>
                        <td className="px-4 py-3">
                          {w.paymentProofFile ? (
                            <button onClick={() => viewProof(w)} disabled={proofLoading[w._id]} className="text-xs text-primary hover:underline">
                              {proofLoading[w._id] ? 'Loading...' : 'View'}
                            </button>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            <button onClick={() => setViewBankDetails(w)} title="View Bank Details" className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">visibility</span> Bank
                            </button>
                            {w.status === 'PENDING' && (
                              <>
                                <button onClick={() => openWAction(w, 'process')} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200">Process</button>
                                <button onClick={() => openWAction(w, 'pay')} className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Mark Paid</button>
                                <button onClick={() => openWAction(w, 'reject')} className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                              </>
                            )}
                            {w.status === 'PROCESSING' && (
                              <>
                                <button onClick={() => openWAction(w, 'pay')} className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Mark Paid</button>
                                <button onClick={() => openWAction(w, 'reject')} className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                <span className="text-sm text-text-muted">Page {wFilters.page} of {wPagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={wFilters.page === 1} onClick={() => setWFilters(p => ({ ...p, page: p.page - 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">Prev</button>
                  <button disabled={wFilters.page === wPagination.totalPages} onClick={() => setWFilters(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}

          {/* ── Bank Details Modal ── */}
          {viewBankDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4 border-b pb-3 border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">account_balance</span>
                    Bank Details
                  </h3>
                  <button onClick={() => setViewBankDetails(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
                    <span className="material-symbols-outlined text-gray-500">close</span>
                  </button>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Vendor Business</p>
                    <p className="font-medium text-gray-900">{viewBankDetails.vendor?.businessName || viewBankDetails.vendor?.name}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                    <div>
                      <p className="text-gray-500 text-xs">Bank Name</p>
                      <p className="font-medium text-gray-900">{viewBankDetails.bankSnapshot?.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Account Holder Name</p>
                      <p className="font-medium text-gray-900">{viewBankDetails.bankSnapshot?.accountName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Account Number</p>
                      <p className="font-mono font-medium text-gray-900 tracking-wider">
                        {viewBankDetails.bankSnapshot?.accountNumber || viewBankDetails.bankSnapshot?.maskedAccountNumber || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">IFSC Code</p>
                      <p className="font-mono font-medium text-gray-900">{viewBankDetails.bankSnapshot?.ifscCode || 'N/A'}</p>
                    </div>
                    {viewBankDetails.bankSnapshot?.upiId && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-gray-500 text-xs">UPI ID</p>
                        <p className="font-medium text-gray-900">{viewBankDetails.bankSnapshot?.upiId}</p>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewBankDetails(null)} className="w-full mt-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium text-sm transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── Withdrawal Action Modal ── */}
          {selectedWithdrawal && wActionType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">
                    {wActionType === 'process' ? 'Mark as Processing' : wActionType === 'pay' ? 'Mark as Paid' : 'Reject Withdrawal'}
                  </h3>
                  <button onClick={() => setSelectedWithdrawal(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
                    <span className="material-symbols-outlined text-gray-500">close</span>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                  <p className="text-gray-600">Vendor: <span className="font-medium text-gray-900">{selectedWithdrawal.vendor?.businessName || selectedWithdrawal.vendor?.name}</span></p>
                  <p className="text-gray-600 mt-1">Amount: <span className="font-bold text-gray-900">{formatPaise(selectedWithdrawal.amountPaise, selectedWithdrawal.amountRupees)}</span></p>
                  <div className="mt-2 text-xs text-gray-500">
                    <p>Bank: {selectedWithdrawal.bankSnapshot?.bankName} — {selectedWithdrawal.bankSnapshot?.maskedAccountNumber}</p>
                    <p>IFSC: {selectedWithdrawal.bankSnapshot?.ifscCode}</p>
                    {selectedWithdrawal.bankSnapshot?.upiId && <p>UPI: {selectedWithdrawal.bankSnapshot?.upiId}</p>}
                  </div>
                </div>

                <form onSubmit={handleWAction} className="space-y-3">
                  {wActionType === 'pay' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                        <select required className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" value={wForm.paymentMethod} onChange={e => setWForm(p => ({...p, paymentMethod: e.target.value}))}>
                          {['UPI','BANK_TRANSFER','IMPS','NEFT','RTGS','OTHER'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTR / Transaction Reference *</label>
                        <input required type="text" placeholder="e.g. UTR12345678" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" value={wForm.utr} onChange={e => setWForm(p => ({...p, utr: e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Proof (Screenshot/PDF) *</label>
                        <input required type="file" accept="image/*,application/pdf" className="w-full border border-gray-200 rounded-xl p-2.5 text-sm file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-violet-100 file:text-violet-700 file:rounded-lg" onChange={e => setWForm(p => ({...p, proofFile: e.target.files[0]}))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note (Optional)</label>
                        <textarea className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" rows="2" value={wForm.adminNote} onChange={e => setWForm(p => ({...p, adminNote: e.target.value}))} />
                      </div>
                    </>
                  )}
                  {wActionType === 'reject' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                      <textarea required className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" rows="3" placeholder="Explain why this withdrawal is being rejected..." value={wForm.rejectionReason} onChange={e => setWForm(p => ({...p, rejectionReason: e.target.value}))} />
                    </div>
                  )}
                  {wActionType === 'process' && (
                    <p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-3">This will move the withdrawal to <strong>Processing</strong> state, indicating you have started the transfer.</p>
                  )}

                  {wFormError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{wFormError}</p>}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setSelectedWithdrawal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={wSubmitting} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60 ${
                      wActionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : wActionType === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}>{wSubmitting ? 'Processing...' : wActionType === 'process' ? 'Mark Processing' : wActionType === 'pay' ? 'Confirm Paid' : 'Reject'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Settlement Modal */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <h3 className="font-semibold text-text-primary text-lg">Record Manual Settlement</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:bg-surface-variant p-1 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Vendor</label>
                <select required className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" value={settleForm.vendorId} onChange={(e) => setSettleForm(prev => ({...prev, vendorId: e.target.value}))}>
                  <option value="">Select Vendor...</option>
                  {vendorsList.map(v => (
                    <option key={v._id} value={v._id}>{v.businessName || v.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Amount (₹)</label>
                  <input type="number" required min="1" className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" value={settleForm.amount} onChange={(e) => setSettleForm(prev => ({...prev, amount: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Method</label>
                  <select required className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" value={settleForm.method} onChange={(e) => setSettleForm(prev => ({...prev, method: e.target.value}))}>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Direction</label>
                <select required className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" value={settleForm.direction} onChange={(e) => setSettleForm(prev => ({...prev, direction: e.target.value}))}>
                  <option value="ADMIN_TO_VENDOR">Admin Paid Vendor</option>
                  <option value="VENDOR_TO_ADMIN">Vendor Paid Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Reference No.</label>
                <input type="text" className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" placeholder="e.g. UTR number" value={settleForm.reference} onChange={(e) => setSettleForm(prev => ({...prev, reference: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Notes (Optional)</label>
                <textarea className="w-full border border-border rounded-xl p-2.5 bg-background focus:border-primary" rows="2" value={settleForm.notes} onChange={(e) => setSettleForm(prev => ({...prev, notes: e.target.value}))}></textarea>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-surface-variant text-text-primary rounded-xl font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary text-white rounded-xl font-medium disabled:opacity-70">
                  {isSubmitting ? 'Recording...' : 'Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
};

export default AdminPaymentsPage;
