import { useState, useEffect } from 'react';
import { getCommissions, setCommission, getPlatformFee, updatePlatformFee, getVendors } from '../services/adminApi';

const CommissionsPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [platformFee, setPlatformFee] = useState({ percentage: 0 });
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeForm, setFeeForm] = useState('');
  const [commForm, setCommForm] = useState({ vendor: '', customPercentage: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [c, p, v] = await Promise.all([getCommissions(), getPlatformFee(), getVendors()]);
      setCommissions(c.data.data);
      if (p.data.data) { setPlatformFee(p.data.data); setFeeForm(p.data.data.percentage); }
      setVendors(v.data.data);
    } catch (e) {} setLoading(false);
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await updatePlatformFee({ percentage: Number(feeForm) }); load(); alert('Updated successfully'); } catch (e) { alert('Failed'); } setSaving(false);
  };

  const handleCommSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await setCommission({ vendor: commForm.vendor, customPercentage: Number(commForm.customPercentage) }); setCommForm({ vendor: '', customPercentage: '' }); load(); } catch (e) { alert('Failed'); } setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Commission Rates</h1>

      {/* Global Platform Fee */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border flex flex-col sm:flex-row gap-6 items-center justify-between">
        <div><h3 className="font-semibold text-text-primary">Global Platform Fee</h3><p className="text-sm text-text-secondary mt-1">Default commission charged to vendors per booking</p></div>
        <form onSubmit={handleFeeSubmit} className="flex gap-2">
          <div className="relative"><input type="number" value={feeForm} onChange={e => setFeeForm(e.target.value)} required className="w-24 pl-3 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-center font-bold text-lg" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-bold">%</span></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Update</button>
        </form>
      </div>

      {/* Custom Vendor Commissions */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">Custom Vendor Rates</h3>
        <form onSubmit={handleCommSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
          <select value={commForm.vendor} onChange={e => setCommForm({...commForm, vendor: e.target.value})} required className="flex-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="">Select Vendor</option>{vendors.map(v => <option key={v._id} value={v._id}>{v.name} - {v.businessName}</option>)}</select>
          <div className="relative"><input type="number" value={commForm.customPercentage} onChange={e => setCommForm({...commForm, customPercentage: e.target.value})} placeholder="Custom rate" required className="w-32 pl-3 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">%</span></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-success text-white rounded-xl text-sm font-medium hover:bg-success/80">Set Custom Rate</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className="text-left py-3 text-text-muted">Vendor</th><th className="text-left py-3 text-text-muted">Custom Rate</th><th className="text-left py-3 text-text-muted">Date Set</th></tr></thead>
            <tbody className="divide-y divide-border">
              {commissions.length === 0 ? <tr><td colSpan="3" className="py-4 text-center text-text-muted">No custom rates configured</td></tr> :
                commissions.map(c => (
                  <tr key={c._id} className="hover:bg-surface-elevated"><td className="py-3 text-text-primary font-medium">{c.vendor?.name} ({c.vendor?.businessName})</td><td className="py-3 font-bold text-primary-400">{c.customPercentage}%</td><td className="py-3 text-text-secondary">{new Date(c.updatedAt).toLocaleDateString()}</td></tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default CommissionsPage;
