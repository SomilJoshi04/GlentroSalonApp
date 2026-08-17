import { useState, useEffect } from 'react';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, assignSubscription, getVendors } from '../services/adminApi';

const SubscriptionsPage = () => {
  const [plans, setPlans] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', price: '', durationDays: '', maxSalons: '1', maxStaffPerSalon: '5', features: '' });
  const [assignForm, setAssignForm] = useState({ vendor: '', plan: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [p, v] = await Promise.all([getSubscriptionPlans(), getVendors()]); setPlans(p.data.data); setVendors(v.data.data); } catch (e) {} setLoading(false); };

  const handlePlanSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await createSubscriptionPlan({ ...planForm, price: Number(planForm.price), durationDays: Number(planForm.durationDays), maxSalons: Number(planForm.maxSalons), maxStaffPerSalon: Number(planForm.maxStaffPerSalon), features: planForm.features.split(',').map(f => f.trim()).filter(Boolean) });
      setShowPlanForm(false); load();
      setPlanForm({ name: '', price: '', durationDays: '', maxSalons: '1', maxStaffPerSalon: '5', features: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await assignSubscription(assignForm); setShowAssignForm(false); alert('Assigned successfully'); } catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-text-primary">Subscriptions</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowAssignForm(!showAssignForm); setShowPlanForm(false); }} className="px-4 py-2 bg-surface-elevated text-text-primary rounded-xl text-sm font-medium border border-border hover:bg-surface-card">Assign Plan</button>
          <button onClick={() => { setShowPlanForm(!showPlanForm); setShowAssignForm(false); }} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">+ New Plan</button>
        </div>
      </div>

      {showPlanForm && (
        <form onSubmit={handlePlanSubmit} className="bg-surface-card rounded-2xl p-6 border border-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium text-text-secondary">Name*</label><input value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Price (₹)*</label><input type="number" value={planForm.price} onChange={e => setPlanForm({...planForm, price: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Duration (Days)*</label><input type="number" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Max Salons</label><input type="number" value={planForm.maxSalons} onChange={e => setPlanForm({...planForm, maxSalons: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Max Staff/Salon</label><input type="number" value={planForm.maxStaffPerSalon} onChange={e => setPlanForm({...planForm, maxStaffPerSalon: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium text-text-secondary">Features (comma-separated)</label><input value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})} placeholder="e.g. Analytics, Priority Support" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Create Plan</button>
        </form>
      )}

      {showAssignForm && (
        <form onSubmit={handleAssignSubmit} className="bg-surface-card rounded-2xl p-6 border border-border flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full"><label className="text-sm font-medium text-text-secondary">Vendor*</label><select value={assignForm.vendor} onChange={e => setAssignForm({...assignForm, vendor: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="">Select Vendor</option>{vendors.map(v => <option key={v._id} value={v._id}>{v.name} - {v.businessName}</option>)}</select></div>
          <div className="flex-1 w-full"><label className="text-sm font-medium text-text-secondary">Plan*</label><select value={assignForm.plan} onChange={e => setAssignForm({...assignForm, plan: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="">Select Plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
          <button type="submit" disabled={saving} className="w-full sm:w-auto px-6 py-2.5 bg-success text-white rounded-xl text-sm font-medium hover:bg-success/80">Assign</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(p => (
          <div key={p._id} className="bg-gradient-to-b from-surface-card to-surface-elevated border border-border rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-xl font-bold text-text-primary">{p.name}</h3>
            <p className="mt-4"><span className="text-3xl font-bold text-text-primary">₹{p.price}</span><span className="text-text-muted"> / {p.durationDays} days</span></p>
            <ul className="mt-6 space-y-3 text-sm text-text-secondary">
              <li className="flex items-center gap-2">✓ Up to {p.maxSalons} salon(s)</li>
              <li className="flex items-center gap-2">✓ Up to {p.maxStaffPerSalon} staff per salon</li>
              {p.features?.map((f, i) => <li key={i} className="flex items-center gap-2">✓ {f}</li>)}
            </ul>
            <div className={`mt-6 inline-block px-3 py-1 rounded-full text-xs font-semibold ${p.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{p.isActive ? 'Active Plan' : 'Inactive Plan'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SubscriptionsPage;
