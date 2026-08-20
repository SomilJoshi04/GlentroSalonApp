import { useState, useEffect } from 'react';
import { getSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, assignSubscription, getVendors } from '../services/adminApi';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';

const SubscriptionsPage = () => {
  const [plans, setPlans] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', price: '', durationDays: '', maxSalons: '1', maxStaffPerSalon: '5', features: '' });
  const [assignForm, setAssignForm] = useState({ vendor: '', plan: '' });
  const [saving, setSaving] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 6
  });

  useEffect(() => { load(1); }, []);

  const load = async (page = 1) => { 
    setLoading(true);
    setError(null);
    try { 
      const [p, v] = await Promise.all([
        getSubscriptionPlans({ page, limit: pagination.limit }), 
        getVendors({ limit: 1000 })
      ]); 
      
      const pData = p.data?.data;
      const list = pData?.plans || pData || [];
      setPlans(Array.isArray(list) ? list : []); 

      if (pData && pData.plans) {
        setPagination({
          currentPage: pData.page || page,
          totalPages: pData.totalPages || 1,
          total: pData.total || list.length,
          limit: pagination.limit
        });
      } else {
        setPagination({
          currentPage: 1,
          totalPages: 1,
          total: Array.isArray(list) ? list.length : 0,
          limit: pagination.limit
        });
      }

      const vendorData = v.data?.data;
      setVendors(Array.isArray(vendorData?.vendors) ? vendorData.vendors : (Array.isArray(vendorData) ? vendorData : [])); 
    } catch (e) {
      setError('Unable to load subscriptions. Please try again.');
    } 
    setLoading(false); 
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      await createSubscriptionPlan({ 
        ...planForm, 
        price: Number(planForm.price), 
        durationDays: Number(planForm.durationDays), 
        maxSalons: Number(planForm.maxSalons), 
        maxStaffPerSalon: Number(planForm.maxStaffPerSalon), 
        features: planForm.features.split(',').map(f => f.trim()).filter(Boolean) 
      });
      setShowPlanForm(false); 
      load(1);
      setPlanForm({ name: '', price: '', durationDays: '', maxSalons: '1', maxStaffPerSalon: '5', features: '' });
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed'); 
    } 
    setSaving(false);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try { 
      await assignSubscription(assignForm); 
      setShowAssignForm(false); 
      alert('Assigned successfully'); 
      load(pagination.currentPage);
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed'); 
    } 
    setSaving(false);
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Subscriptions"
        description="Manage vendor subscription plans and assignments."
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setShowAssignForm(!showAssignForm); setShowPlanForm(false); }} className="px-4 py-2 bg-surface border border-border text-on-surface rounded-xl text-[14px] font-medium hover:bg-surface-variant transition-colors shadow-sm">
              Assign Plan
            </button>
            <button onClick={() => { setShowPlanForm(!showPlanForm); setShowAssignForm(false); }} className="px-4 py-2 bg-primary text-white rounded-xl text-[14px] font-medium hover:bg-primary-600 transition-colors shadow-sm">
              + New Plan
            </button>
          </div>
        }
      />

      <Modal isOpen={showPlanForm} onClose={() => setShowPlanForm(false)} title="New Plan" size="md">
        <form onSubmit={handlePlanSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-text-secondary">Name*</label><input value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Price (₹)*</label><input type="number" value={planForm.price} onChange={e => setPlanForm({...planForm, price: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Duration (Days)*</label><input type="number" value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Max Salons</label><input type="number" value={planForm.maxSalons} onChange={e => setPlanForm({...planForm, maxSalons: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Max Staff/Salon</label><input type="number" value={planForm.maxStaffPerSalon} onChange={e => setPlanForm({...planForm, maxStaffPerSalon: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium text-text-secondary">Features (comma-separated)</label><input value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})} placeholder="e.g. Analytics, Priority Support" className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowPlanForm(false)} className="px-5 py-2.5 text-text-muted hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Create Plan</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAssignForm} onClose={() => setShowAssignForm(false)} title="Assign Plan" size="md">
        <form onSubmit={handleAssignSubmit} className="flex flex-col gap-4">
          <div className="w-full"><label className="text-sm font-medium text-text-secondary">Vendor*</label><select value={assignForm.vendor} onChange={e => setAssignForm({...assignForm, vendor: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="">Select Vendor</option>{vendors.map(v => <option key={v._id} value={v._id}>{v.name} - {v.businessName}</option>)}</select></div>
          <div className="w-full"><label className="text-sm font-medium text-text-secondary">Plan*</label><select value={assignForm.plan} onChange={e => setAssignForm({...assignForm, plan: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="">Select Plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAssignForm(false)} className="px-5 py-2.5 text-text-muted hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-success text-white rounded-xl text-sm font-medium hover:bg-success/80">Assign</button>
          </div>
        </form>
      </Modal>

      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.length === 0 ? <p className="text-text-muted col-span-full py-8 text-center">No subscription plans found.</p> :
            plans.map(p => (
              <div key={p._id} className="bg-surface rounded-2xl p-6 border border-border relative overflow-hidden shadow-sm flex flex-col hover:border-primary/50 transition-colors">
                <h3 className="text-xl font-bold text-on-surface">{p.name}</h3>
                <p className="mt-4"><span className="text-3xl font-extrabold text-primary">₹{p.price}</span><span className="text-muted-text font-medium"> / {p.durationDays} days</span></p>
                <ul className="mt-6 space-y-3 text-sm text-text-secondary flex-1">
                  <li className="flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-[18px] text-primary">check</span> Up to {p.maxSalons} salon(s)</li>
                  <li className="flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-[18px] text-primary">check</span> Up to {p.maxStaffPerSalon} staff per salon</li>
                  {p.features?.map((f, i) => <li key={i} className="flex items-center gap-2 text-on-surface"><span className="material-symbols-outlined text-[18px] text-primary">check</span> {f}</li>)}
                </ul>
                <div className={`mt-6 self-start px-3 py-1 rounded-full text-[12px] font-bold tracking-wide uppercase ${p.isActive ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
                  {p.isActive ? 'Active Plan' : 'Inactive Plan'}
                </div>
              </div>
            ))}
          </div>
          
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={load}
          />
        </div>
      )}
    </AdminPageLayout>
  );
};

export default SubscriptionsPage;
