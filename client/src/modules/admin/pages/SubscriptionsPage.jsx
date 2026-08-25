import { useState, useEffect } from 'react';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan, getSubscriptionSettings, updateSubscriptionSettings, getVendors, getVendorSubscriptionHistory, cancelVendorSubscription } from '../services/adminApi';
import Modal from '../../../components/common/Modal';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';

const SubscriptionsPage = () => {
  const [activeTab, setActiveTab] = useState('PLANS'); // PLANS, SETTINGS, VENDORS
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Forms
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ _id: null, name: '', price: '', duration: '', durationUnit: 'MONTHS', displayOrder: '0', isActive: true, features: '' });
  const [saving, setSaving] = useState(false);

  // Vendor History
  const [selectedVendor, setSelectedVendor] = useState('');
  const [vendorHistory, setVendorHistory] = useState([]);

  useEffect(() => { loadData(); }, [activeTab]);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'PLANS') {
        const res = await getSubscriptionPlans();
        setPlans(res.data?.data || []);
      } else if (activeTab === 'SETTINGS') {
        const res = await getSubscriptionSettings();
        setSettings(res.data?.data);
      } else if (activeTab === 'VENDORS') {
        const res = await getVendors({ limit: 1000 });
        setVendors(res.data?.data?.vendors || res.data?.data || []);
      }
    } catch (err) {
      setError('Failed to load data.');
    }
    setLoading(false);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { 
        ...planForm, 
        price: Number(planForm.price), 
        duration: Number(planForm.duration), 
        displayOrder: Number(planForm.displayOrder),
        features: planForm.features.split(',').map(f => f.trim()).filter(Boolean) 
      };
      if (planForm._id) {
        await updateSubscriptionPlan(planForm._id, payload);
      } else {
        await createSubscriptionPlan(payload);
      }
      setShowPlanForm(false);
      loadData();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateSubscriptionSettings(settings);
      alert('Settings updated successfully');
    } catch (e) { alert('Failed to update settings'); }
    setSaving(false);
  };

  const fetchVendorHistory = async (vid) => {
    if (!vid) { setVendorHistory([]); return; }
    try {
      const res = await getVendorSubscriptionHistory(vid);
      setVendorHistory(res.data?.data || []);
    } catch (e) { alert('Failed to load history'); }
  };

  const handleCancelSubscription = async (vid) => {
    if (!window.confirm('Are you sure you want to revoke all active subscriptions for this vendor?')) return;
    try {
      await cancelVendorSubscription(vid, 'Revoked by Admin');
      fetchVendorHistory(vid);
      alert('Subscription revoked.');
    } catch (e) { alert('Failed to revoke'); }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Subscriptions"
        description="Manage plans, free trials, and vendor subscription statuses."
        actions={
          activeTab === 'PLANS' && (
            <button onClick={() => { 
              setPlanForm({ _id: null, name: '', price: '', duration: '', durationUnit: 'MONTHS', displayOrder: '0', isActive: true, features: '' });
              setShowPlanForm(true); 
            }} className="px-4 py-2 bg-primary text-white rounded-xl text-[14px] font-medium hover:bg-primary-600 transition-colors shadow-sm">
              + New Plan
            </button>
          )
        }
      />

      <div className="flex gap-4 border-b border-border mb-6">
        {['PLANS', 'SETTINGS', 'VENDORS'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {tab === 'PLANS' ? 'Subscription Plans' : tab === 'SETTINGS' ? 'Global Settings' : 'Vendor Subscriptions'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-8 text-text-muted">Loading...</div> : error ? <div className="text-danger p-4 bg-danger/10 rounded-xl">{error}</div> : (
        <>
          {/* PLANS TAB */}
          {activeTab === 'PLANS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(p => (
                <div key={p._id} className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-on-surface">{p.name}</h3>
                    <button onClick={() => {
                      setPlanForm({ ...p, features: p.features.join(', ') });
                      setShowPlanForm(true);
                    }} className="text-text-muted hover:text-primary">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  </div>
                  <p className="mt-4"><span className="text-3xl font-extrabold text-primary">₹{p.price}</span><span className="text-muted-text font-medium"> / {p.duration} {p.durationUnit}</span></p>
                  <ul className="mt-6 space-y-3 text-sm text-text-secondary flex-1">
                    {p.features?.map((f, i) => <li key={i} className="flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-[18px] text-primary">check</span> {f}</li>)}
                  </ul>
                  <div className={`mt-6 self-start px-3 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase ${p.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'SETTINGS' && settings && (
            <form onSubmit={handleSettingsSubmit} className="max-w-2xl bg-surface p-6 rounded-2xl border border-border space-y-6">
              <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-xl">
                <div>
                  <h4 className="font-bold text-on-surface">Enable Subscription System</h4>
                  <p className="text-sm text-text-secondary">Toggle the entire subscription functionality.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.systemEnabled} onChange={e => setSettings({...settings, systemEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-xl">
                <div>
                  <h4 className="font-bold text-on-surface">Enable Free Trial</h4>
                  <p className="text-sm text-text-secondary">Allow new vendors to start a free trial.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.freeTrialEnabled} onChange={e => setSettings({...settings, freeTrialEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Free Trial Duration (Days)</label>
                  <input type="number" value={settings.trialDurationDays} onChange={e => setSettings({...settings, trialDurationDays: Number(e.target.value)})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Grace Period (Days)</label>
                  <input type="number" value={settings.gracePeriodDays} onChange={e => setSettings({...settings, gracePeriodDays: Number(e.target.value)})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" />
                </div>
              </div>

              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium w-full">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          )}

          {/* VENDORS TAB */}
          {activeTab === 'VENDORS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-1 bg-surface border border-border rounded-2xl p-4">
                <label className="text-sm font-medium text-text-secondary">Select Vendor</label>
                <select value={selectedVendor} onChange={e => { setSelectedVendor(e.target.value); fetchVendorHistory(e.target.value); }} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm">
                  <option value="">-- Choose Vendor --</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.businessName || v.name}</option>)}
                </select>
              </div>
              
              <div className="md:col-span-2 space-y-4">
                {selectedVendor && vendorHistory.length === 0 && <p className="text-text-muted">No subscription history found.</p>}
                {vendorHistory.map(sub => (
                  <div key={sub._id} className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-on-surface">{sub.planNameSnapshot || 'Trial'}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sub.status === 'ACTIVE' ? 'bg-success/10 text-success' : sub.status === 'EXPIRED' ? 'bg-error/10 text-error' : 'bg-text-muted/10 text-text-muted'}`}>{sub.status}</span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{sub.type} • {sub.durationSnapshot} {sub.durationUnitSnapshot}</p>
                      <p className="text-xs text-text-muted mt-1">{new Date(sub.startDate).toLocaleDateString()} to {new Date(sub.endDate).toLocaleDateString()}</p>
                    </div>
                    {sub.status === 'ACTIVE' && (
                      <button onClick={() => handleCancelSubscription(sub.vendor)} className="px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-sm font-medium hover:bg-danger hover:text-white transition-colors">Revoke</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* PLAN FORM MODAL */}
      <Modal isOpen={showPlanForm} onClose={() => setShowPlanForm(false)} title={planForm._id ? "Edit Plan" : "New Plan"} size="md">
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="text-sm font-medium text-text-secondary">Name*</label><input value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} required className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Price (₹)*</label><input type="number" value={planForm.price} onChange={e => setPlanForm({...planForm, price: e.target.value})} required className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Duration*</label><input type="number" value={planForm.duration} onChange={e => setPlanForm({...planForm, duration: e.target.value})} required className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border" /></div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Unit*</label>
              <select value={planForm.durationUnit} onChange={e => setPlanForm({...planForm, durationUnit: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border">
                <option value="DAYS">Days</option>
                <option value="MONTHS">Months</option>
                <option value="YEARS">Years</option>
              </select>
            </div>
            <div><label className="text-sm font-medium text-text-secondary">Display Order</label><input type="number" value={planForm.displayOrder} onChange={e => setPlanForm({...planForm, displayOrder: e.target.value})} className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border" /></div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="isActive" checked={planForm.isActive} onChange={e => setPlanForm({...planForm, isActive: e.target.checked})} className="rounded border-border text-primary focus:ring-primary h-4 w-4" />
            <label htmlFor="isActive" className="text-sm font-medium text-on-surface">Active (Visible to vendors)</label>
          </div>
          <div><label className="text-sm font-medium text-text-secondary">Features (comma-separated)</label><input value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})} placeholder="e.g. Analytics, Priority Support" className="w-full mt-1 px-3 py-2 rounded-xl bg-surface-elevated border border-border" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPlanForm(false)} className="px-5 py-2.5 text-text-muted hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">Save</button>
          </div>
        </form>
      </Modal>

    </AdminPageLayout>
  );
};

export default SubscriptionsPage;
