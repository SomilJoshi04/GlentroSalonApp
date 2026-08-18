import { useState, useEffect } from 'react';
import { getVendorOffers, createOffer, updateOffer, deleteOffer, toggleOfferStatus, getVendorSalons, getServices } from '../services/vendorApi';

const OfferManagePage = () => {
  const [offers, setOffers] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form, setForm] = useState({ title: '', salon: '', description: '', discountType: 'percentage', discountValue: '', applicableServices: [], validFrom: '', validTo: '' });

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { loadOffers(); }, [filters]);
  useEffect(() => { if (form.salon) loadSvc(form.salon); }, [form.salon]);

  const loadInit = async () => { 
    try { 
      const [o, s] = await Promise.all([getVendorOffers(), getVendorSalons()]); 
      setOffers(o.data.data); 
      setSalons(s.data.data); 
    } catch (e) {} 
    setLoading(false); 
  };

  const loadOffers = async () => {
    setIsFetching(true);
    try {
      const query = {};
      if (filters.search) query.search = filters.search;
      if (filters.status) query.status = filters.status;
      const r = await getVendorOffers(query);
      setOffers(r.data.data);
    } catch (e) {}
    setIsFetching(false);
  };

  const loadSvc = async (salonId) => { 
    try { 
      const r = await getServices({ salon: salonId, isActive: 'all' }); 
      setServices(r.data.data.services); 
    } catch (e) {} 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    
    // Validation
    if (new Date(form.validFrom) > new Date(form.validTo)) {
      alert('End Date must be after Start Date');
      setSaving(false);
      return;
    }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      alert('Percentage discount cannot exceed 100%');
      setSaving(false);
      return;
    }

    try { 
      const payload = { 
        ...form, 
        discountValue: Number(form.discountValue) 
      };

      if (editingOffer) {
        await updateOffer(editingOffer._id, payload);
      } else {
        await createOffer(payload);
      }

      setShowForm(false); 
      setEditingOffer(null);
      setForm({ title: '', salon: '', description: '', discountType: 'percentage', discountValue: '', applicableServices: [], validFrom: '', validTo: '' });
      loadOffers(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to save offer'); 
    } 
    setSaving(false);
  };

  const handleDelete = async (id) => { 
    if (confirm('Are you sure you want to delete this offer?')) { 
      try { await deleteOffer(id); loadOffers(); } catch (e) { alert('Failed to delete'); } 
    } 
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleOfferStatus(id);
      loadOffers();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const openEditForm = (o) => {
    setEditingOffer(o);
    setForm({
      title: o.title,
      salon: o.salon?._id || '',
      description: o.description || '',
      discountType: o.discountType,
      discountValue: o.discountValue,
      applicableServices: o.applicableServices?.map(s => s._id) || [],
      validFrom: new Date(o.validFrom).toISOString().split('T')[0],
      validTo: new Date(o.validTo).toISOString().split('T')[0]
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statusColors = { 
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    ACTIVE: 'bg-green-100 text-green-700 border-green-200', 
    REJECTED: 'bg-red-100 text-red-700 border-red-200' 
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => (
             <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative max-w-5xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[24px] sm:text-[28px] text-on-surface font-bold">Offers & Promotions</h1>
          <p className="font-body-md text-muted-text mt-1">Configure special discounts and promotional campaigns.</p>
        </div>
        <button onClick={() => {
          setEditingOffer(null);
          setForm({ title: '', salon: salons.length > 0 ? salons[0]._id : '', description: '', discountType: 'percentage', discountValue: '', applicableServices: [], validFrom: '', validTo: '' });
          setShowForm(!showForm);
        }} className={`w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Create Offer'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <input 
          type="text" 
          placeholder="Search offers by title..." 
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
        />
        <select 
          value={filters.status}
          onChange={e => setFilters({...filters, status: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold text-on-surface">{editingOffer ? 'Edit Offer Details' : 'Create New Offer Campaign'}</h2>
          
          {editingOffer?.status === 'ACTIVE' && (
            <div className="p-3 bg-warning/10 text-warning-dark border border-warning/30 rounded-lg text-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[20px] text-warning">warning</span>
              <div>
                <strong>Warning:</strong> Editing an active offer will return it to <strong>PENDING</strong> status and hide it from customers until re-approved by an Admin.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Title*</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Salon*</label>
              <select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, applicableServices: []})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="">Select</option>
                {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Discount Type</label>
              <select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Value*</label>
              <div className="relative">
                {form.discountType === 'flat' && <span className="absolute left-3 top-2.5 text-muted-text">₹</span>}
                <input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required className={`w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm ${form.discountType === 'flat' ? 'pl-7' : ''}`} />
                {form.discountType === 'percentage' && <span className="absolute right-3 top-2.5 text-muted-text">%</span>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid From*</label>
              <input type="date" required value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid To*</label>
              <input type="date" required value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>

          {services.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-muted-text mb-2 block">Applicable Services (Leave empty to apply to all)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-border rounded-xl bg-background-alt">
                {services.map(s => (
                  <label key={s._id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface cursor-pointer hover:bg-surface-variant transition-colors text-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary bg-surface"
                      checked={form.applicableServices.includes(s._id)} 
                      onChange={e => setForm({...form, applicableServices: e.target.checked ? [...form.applicableServices, s._id] : form.applicableServices.filter(x => x !== s._id)})} 
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface">{s.name}</span>
                      <span className="text-xs text-muted-text">₹{s.price} • {s.duration} min</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : form.salon && (
             <div className="text-sm text-muted-text italic p-3 bg-background-alt border border-border rounded-xl">No services configured for this salon yet.</div>
          )}

          <div>
            <label className="text-sm font-medium text-muted-text mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : editingOffer ? 'Update Offer' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isFetching ? (
          Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-[280px] bg-surface rounded-2xl animate-pulse border border-border shadow-sm"></div>
          ))
        ) : offers.length === 0 && !loading ? (
          <div className="col-span-full py-16 text-center text-muted-text bg-surface rounded-2xl border border-border flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">local_offer</span>
            <p className="font-medium text-on-surface text-lg">No offers found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new offer.</p>
          </div>
        ) : (
          offers.map(o => (
          <div key={o._id} className="bg-surface rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
            {o.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>}
            {o.status === 'REJECTED' && <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>}
            {o.status === 'PENDING' && <div className="absolute top-0 left-0 w-1 h-full bg-warning"></div>}
            
            <div className="p-5 flex-1 bg-surface">
              <div className="flex justify-between items-start mb-3 gap-2">
                <div>
                  <h4 className="font-bold text-on-surface text-base">{o.title}</h4>
                  <p className="text-xs text-muted-text mt-0.5">{o.salon?.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${statusColors[o.status]}`}>
                    {o.status === 'ACTIVE' ? 'APPROVED' : o.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border ${o.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {o.isActive ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>

              <div className="inline-block px-3 py-1 bg-soft-primary border border-primary/10 text-primary rounded-lg font-bold text-lg mb-4">
                {o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-text mb-4 bg-background-alt border border-border p-2.5 rounded-lg">
                <div>
                  <span className="font-semibold block text-on-surface">Valid From</span>
                  {new Date(o.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div>
                  <span className="font-semibold block text-on-surface">Valid To</span>
                  {new Date(o.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {o.status === 'REJECTED' && o.adminNote && (
                <div className="mb-4 p-3 bg-error/5 border border-error/10 rounded-lg">
                  <span className="text-xs font-bold text-error uppercase tracking-wider block mb-1">Rejection Reason:</span>
                  <p className="text-xs text-error-dark">{o.adminNote}</p>
                </div>
              )}

              {o.description && <p className="text-sm text-muted-text mb-4">{o.description}</p>}
              
              {o.applicableServices?.length > 0 && (
                <div className="space-y-1 mt-auto">
                  <p className="text-[10px] font-semibold text-muted-text/80 uppercase tracking-wider">Applicable to ({o.applicableServices.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {o.applicableServices.map(s => (
                       <span key={s._id} className="text-[9px] px-2 py-0.5 bg-background-alt text-muted-text border border-border rounded truncate max-w-full">
                         {s.name}
                       </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border flex gap-0">
              <button onClick={() => openEditForm(o)} className="flex-1 text-xs py-3 font-semibold text-on-surface bg-background-alt hover:bg-surface-variant transition-colors flex items-center justify-center gap-1 border-t border-r border-border">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
              <button onClick={() => handleToggleStatus(o._id)} className={`flex-1 text-xs py-3 font-semibold transition-colors border-t border-r border-border flex items-center justify-center gap-1 ${o.isActive ? 'text-warning bg-warning/5 hover:bg-warning/10' : 'text-success bg-success/5 hover:bg-success/10'}`}>
                <span className="material-symbols-outlined text-[16px]">{o.isActive ? 'toggle_on' : 'toggle_off'}</span>
                {o.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => handleDelete(o._id)} className="flex-1 text-xs py-3 font-semibold text-error bg-error/5 hover:bg-error/10 transition-colors flex items-center justify-center gap-1 border-t border-border">
                <span className="material-symbols-outlined text-[16px] text-error">delete</span>
                Delete
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};
export default OfferManagePage;
