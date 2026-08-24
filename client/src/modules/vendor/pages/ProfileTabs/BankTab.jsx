import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { updateVendorBank } from '../../services/vendorApi';
import toast from 'react-hot-toast';

const BankTab = ({ onProfileUpdate }) => {
  const { vendor } = useAuth();
  
  const [form, setForm] = useState({
    accountHolderName: vendor?.bank?.accountHolderName || '',
    accountNumber: vendor?.bank?.accountNumber || '',
    ifscCode: vendor?.bank?.ifscCode || '',
    bankName: vendor?.bank?.bankName || '',
    bankBranch: vendor?.bank?.bankBranch || '',
    upiId: vendor?.bank?.upiId || ''
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await updateVendorBank(form);
      onProfileUpdate(r.data.data);
      toast.success('Bank details updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bank details.');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 flex items-start gap-3 text-blue-700">
        <span className="material-symbols-outlined mt-0.5">account_balance</span>
        <div>
          <h4 className="font-semibold text-sm">Bank Details for Payouts</h4>
          <p className="text-sm mt-1 opacity-90">
            Please ensure these details are accurate. All online booking payouts and settlements will be processed to this account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Account Holder Name</label>
          <input type="text" value={form.accountHolderName} onChange={e => setForm({...form, accountHolderName: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Account Number</label>
          <input type="password" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} placeholder="••••••••" className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">IFSC Code</label>
          <input type="text" value={form.ifscCode} onChange={e => setForm({...form, ifscCode: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all uppercase" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Bank Name</label>
          <input type="text" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Bank Branch</label>
          <input type="text" value={form.bankBranch} onChange={e => setForm({...form, bankBranch: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">UPI ID (Optional)</label>
          <input type="text" value={form.upiId} onChange={e => setForm({...form, upiId: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm">
          {saving ? 'Saving...' : 'Save Bank Details'}
        </button>
      </div>
    </form>
  );
};

export default BankTab;
