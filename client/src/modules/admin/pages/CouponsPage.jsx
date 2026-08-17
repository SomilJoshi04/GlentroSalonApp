import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, deleteCoupon } from '../services/adminApi';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: '', minPurchaseAmount: '0', maxDiscountAmount: '', validFrom: '', validTo: '', usageLimit: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { 
    setLoading(true);
    setError(null);
    try { 
      const r = await getCoupons(); 
      const data = r.data?.data;
      const list = data?.coupons || data || [];
      setCoupons(Array.isArray(list) ? list : []); 
    } catch (e) {
      setError('Unable to load coupons. Please try again.');
    } 
    setLoading(false); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createCoupon({ ...form, code: form.code.toUpperCase(), discountValue: Number(form.discountValue), minPurchaseAmount: Number(form.minPurchaseAmount) }); setShowForm(false); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false);
  };

  const handleDelete = async (id) => { if (confirm('Delete?')) { try { await deleteCoupon(id); load(); } catch (e) {} } };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-text-primary">Coupons</h1><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium">{showForm ? 'Cancel' : '+ Create Coupon'}</button></div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-card rounded-2xl p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-text-secondary">Code*</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm uppercase" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Type</label><select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option></select></div>
            <div><label className="text-sm font-medium text-text-secondary">Value*</label><input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Min Purchase (₹)</label><input type="number" value={form.minPurchaseAmount} onChange={e => setForm({...form, minPurchaseAmount: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Valid From</label><input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Valid To</label><input type="date" value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
        </form>
      )}

      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.length === 0 ? <p className="text-text-muted col-span-full py-8 text-center">No coupons found.</p> :
          coupons.map(c => (
          <div key={c._id} className="bg-surface-card border border-border rounded-2xl p-5">
            <div className="flex justify-between items-start">
              <div className="px-3 py-1 bg-primary-600/20 text-primary-400 font-bold tracking-wider rounded-lg border border-primary-500/30">{c.code}</div>
              <button onClick={() => handleDelete(c._id)} className="text-danger text-xs hover:text-danger/80">Delete</button>
            </div>
            <p className="mt-4 text-xl font-bold text-text-primary">{c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}</p>
            <p className="text-sm text-text-secondary mt-1">Min purchase: ₹{c.minPurchaseAmount}</p>
            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-text-muted">
              <span>Used: {c.usedCount || 0} times</span>
              <span className={c.isActive ? 'text-success' : 'text-danger'}>{c.isActive ? 'Active' : 'Expired'}</span>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
export default CouponsPage;
