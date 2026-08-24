import React, { useState, useEffect } from 'react';
import api from '../../../services/api/axiosInstance';
import AdminPageLayout from '../components/layout/AdminPageLayout';

const VendorCashControlPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [editingLimit, setEditingLimit] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/vendor-cash-control');
      if (res.data?.success) {
        setVendors(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load vendor cash control', error);
      alert('Failed to load vendors');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleUpdateLimit = async (vendorId) => {
    setUpdating((prev) => ({ ...prev, [vendorId]: true }));
    try {
      const paise = Math.round(parseFloat(newLimit) * 100);
      if (isNaN(paise) || paise < 0) throw new Error('Invalid limit amount');
      
      const res = await api.put(`/admin/vendor-cash-control/${vendorId}`, {
        cashLimitEnabled: true,
        cashHoldingLimitPaise: paise,
      });

      if (res.data?.success) {
        setEditingLimit(null);
        setNewLimit('');
        loadVendors();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to update limit');
    }
    setUpdating((prev) => ({ ...prev, [vendorId]: false }));
  };

  const fmt = (paise) => `₹${Number((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <AdminPageLayout title="Vendor Cash Control" subtitle="Manage cash holding limits and monitor vendor cash settlements">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading vendors...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4 text-right">Cash Limit</th>
                  <th className="px-6 py-4 text-right">Cash Held</th>
                  <th className="px-6 py-4 text-right">Excess / Settlement Due</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map((vendor) => {
                  const stats = vendor.cashFinancials || {};
                  const isExceeded = stats.cashLimitExceeded;
                  return (
                    <tr key={vendor._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{vendor.businessName || vendor.name}</div>
                        <div className="text-gray-500 text-xs">{vendor.email}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {editingLimit === vendor._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                              value={newLimit}
                              onChange={(e) => setNewLimit(e.target.value)}
                              placeholder="₹"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateLimit(vendor._id)}
                              disabled={updating[vendor._id]}
                              className="bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingLimit(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center gap-3">
                            <span>{stats.cashHoldingLimitPaise === null ? 'Unlimited' : fmt(stats.cashHoldingLimitPaise)}</span>
                            <button 
                              onClick={() => {
                                setEditingLimit(vendor._id);
                                setNewLimit(stats.cashHoldingLimitPaise ? stats.cashHoldingLimitPaise / 100 : '');
                              }}
                              className="text-gray-400 hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={isExceeded ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                          {fmt(stats.cashHeldPaise)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {stats.excessCashPaise > 0 ? (
                          <div className="text-red-600 font-bold">
                            {fmt(stats.excessCashPaise)}
                            {stats.pendingSettlementPaise > 0 && <span className="text-xs text-orange-500 block">({fmt(stats.pendingSettlementPaise)} pending)</span>}
                          </div>
                        ) : (
                          <span className="text-green-600">₹0.00</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {vendor.suspensionReasons?.includes('CASH_LIMIT_EXCEEDED') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {/* More actions can go here */}
                      </td>
                    </tr>
                  );
                })}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No vendors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
};

export default VendorCashControlPage;
