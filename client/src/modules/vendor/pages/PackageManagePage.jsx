import { useState, useEffect } from 'react';
import { getVendorPackages, createPackage, updatePackage, deletePackage, togglePackageStatus, getVendorSalons, getServices } from '../services/vendorApi';
import Modal from '../../../components/common/Modal';

const PackageManagePage = () => {
  const [packages, setPackages] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [form, setForm] = useState({ 
    name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '',
    validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: '' 
  });

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { loadPackages(); }, [filters]);
  useEffect(() => { if (form.salon) loadServices(form.salon); }, [form.salon]);

  const loadInit = async () => { 
    try { 
      const [p, s] = await Promise.all([getVendorPackages(), getVendorSalons()]); 
      setPackages(p.data.data); 
      setSalons(s.data.data); 
    } catch (e) {} 
    setLoading(false); 
  };

  const loadPackages = async () => {
    setIsFetching(true);
    try {
      const query = {};
      if (filters.search) query.search = filters.search;
      if (filters.status) query.status = filters.status;
      const r = await getVendorPackages(query);
      setPackages(r.data.data);
    } catch (e) {}
    setIsFetching(false);
  };

  const loadServices = async (salonId) => { 
    try { 
      const r = await getServices({ salon: salonId, isActive: 'all' }); 
      setServices(r.data.data.services); 
    } catch (e) {} 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try { 
      const payload = { 
        ...form, 
        totalPrice: Number(form.totalPrice), 
        discountedPrice: Number(form.discountedPrice) 
      };

      if (editingPackage) {
        await updatePackage(editingPackage._id, payload);
      } else {
        await createPackage(payload);
      }

      setShowForm(false); 
      setEditingPackage(null);
      setForm({ 
        name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '',
        validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: ''
      });
      loadPackages(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to save package'); 
    }
    setSaving(false);
  };

  const handleDelete = async (id) => { 
    if (confirm('Are you sure you want to delete this package?')) { 
      try { 
        await deletePackage(id); 
        loadPackages(); 
      } catch (e) { alert('Failed to delete'); } 
    } 
  };

  const handleToggleStatus = async (id) => {
    try {
      await togglePackageStatus(id);
      loadPackages();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const openEditForm = (p) => {
    setEditingPackage(p);
    setForm({
      name: p.name,
      salon: p.salon?._id || '',
      services: p.services?.map(s => s._id) || [],
      totalPrice: p.totalPrice,
      discountedPrice: p.discountedPrice,
      description: p.description || '',
      validFrom: p.validFrom ? new Date(p.validFrom).toISOString().split('T')[0] : '',
      validTo: p.validTo ? new Date(p.validTo).toISOString().split('T')[0] : '',
      usageLimit: p.usageLimit || 0,
      perUserLimit: p.perUserLimit || 0,
      terms: p.terms || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statusColors = { 
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    ACTIVE: 'bg-green-100 text-green-700 border-green-200', 
    REJECTED: 'bg-red-100 text-red-700 border-red-200' 
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[24px] sm:text-[28px] text-on-surface font-bold">Offers & Packages</h1>
          <p className="font-body-md text-muted-text mt-1">Create promotional offers or bundle multiple services together.</p>
        </div>
        <button onClick={() => {
          setEditingPackage(null);
          setForm({ 
            name: '', salon: salons.length > 0 ? salons[0]._id : '', services: [], totalPrice: '', discountedPrice: '', description: '',
            validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: ''
          });
          setShowForm(!showForm);
        }} className={`w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Create Offer/Package'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search offers or packages by name..." 
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
          />
        </div>
        <select 
          value={filters.status}
          onChange={e => setFilters({...filters, status: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm min-w-[150px]">
          <option value="">All Status</option>
          <option value="PENDING">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={editingPackage ? 'Edit Offer/Package' : 'Create New Offer/Package'} 
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {editingPackage?.status === 'ACTIVE' && (
            <div className="p-3.5 bg-warning/10 text-warning-dark border border-warning/30 rounded-xl text-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-warning shrink-0">warning</span>
              <div>
                <strong>Warning:</strong> Editing an active offer/package will return it to <strong>PENDING</strong> status and hide it from customers until re-approved by an Admin.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Offer/Package Name*</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Salon*</label>
              <select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, services: []})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="">Select Salon</option>
                {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Original Price (₹)*</label>
              <input type="number" value={form.totalPrice} readOnly className="w-full px-3.5 py-2.5 bg-surface-variant text-on-surface rounded-xl border border-border text-sm shadow-sm cursor-not-allowed" />
              <p className="text-xs text-muted-text mt-1">Calculated automatically from selected services.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Offer Price (₹)*</label>
              <input type="number" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid From*</label>
              <input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid To*</label>
              <input type="date" value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Total Usage Limit</label>
              <input type="number" placeholder="0 for unlimited" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Usage Limit Per User</label>
              <input type="number" placeholder="0 for unlimited" value={form.perUserLimit} onChange={e => setForm({...form, perUserLimit: e.target.value})} className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>
          
          {services.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-muted-text mb-2 block">Included Services* (Select at least one)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {services.map(s => (
                  <label key={s._id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${form.services.includes(s._id) ? 'bg-soft-primary/30 border-primary text-primary' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary bg-surface"
                      checked={form.services.includes(s._id)} 
                      onChange={e => {
                        const newServices = e.target.checked ? [...form.services, s._id] : form.services.filter(x => x !== s._id);
                        const newTotal = newServices.reduce((sum, id) => {
                          const service = services.find(srv => srv._id === id);
                          return sum + (service ? service.price : 0);
                        }, 0);
                        setForm({...form, services: newServices, totalPrice: newTotal});
                      }} 
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-xs text-muted-text">₹{s.price} • {s.duration} min</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : form.salon && (
             <div className="text-sm text-muted-text italic p-3.5 bg-soft-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
               <span className="material-symbols-outlined text-[18px]">info</span>
               No services found for this salon. Please add services first.
             </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-text mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Describe what's included in this package..." className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-muted-text hover:text-on-surface text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving || form.services.length === 0} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors shadow-sm">
              {saving ? 'Saving...' : editingPackage ? 'Update Package' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isFetching ? (
          Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-[320px] bg-surface rounded-2xl animate-pulse border border-border shadow-sm"></div>
          ))
        ) : packages.length === 0 && !loading ? (
          <div className="col-span-full py-16 text-center text-muted-text bg-surface rounded-2xl border border-border border-dashed flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">inventory_2</span>
            <p className="font-semibold text-on-surface">No offers or packages found</p>
            <p className="text-xs mt-1">Try adjusting your filters or create a new offer/package.</p>
          </div>
        ) : (
          packages.map(p => (
          <div key={p._id} className="bg-surface rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
            {p.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1.5 h-full bg-success"></div>}
            {p.status === 'REJECTED' && <div className="absolute top-0 left-0 w-1.5 h-full bg-error"></div>}
            {p.status === 'PENDING' && <div className="absolute top-0 left-0 w-1.5 h-full bg-warning"></div>}
            
            <div>
              <div className="flex justify-between items-start mb-3 gap-4">
                <div>
                  <h4 className="font-bold text-on-surface text-[17px]">{p.name}</h4>
                  <p className="text-xs text-muted-text mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">store</span>
                    {p.salon?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider border ${statusColors[p.status]}`}>
                    {p.status === 'ACTIVE' ? 'APPROVED' : p.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider border ${p.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-surface-variant text-muted-text border-border'}`}>
                    {p.isActive ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[26px] font-bold text-primary">₹{p.discountedPrice}</span>
                <span className="text-sm text-muted-text line-through font-medium">₹{p.totalPrice}</span>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-lg ml-auto">
                  Save {Math.round(((p.totalPrice - p.discountedPrice) / p.totalPrice) * 100)}%
                </span>
              </div>

              {p.status === 'REJECTED' && p.adminNote && (
                <div className="mb-4 p-3 bg-error/5 border border-error/15 rounded-xl">
                  <span className="text-[10px] font-bold text-error uppercase tracking-wider block mb-0.5">Rejection Reason</span>
                  <p className="text-xs text-error">{p.adminNote}</p>
                </div>
              )}

              {p.validFrom && p.validTo && (
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-text bg-surface-variant p-2 rounded-lg border border-border">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  <span>{new Date(p.validFrom).toLocaleDateString()} - {new Date(p.validTo).toLocaleDateString()}</span>
                </div>
              )}

              {p.description && <p className="text-sm text-muted-text mb-4 line-clamp-2 leading-relaxed">{p.description}</p>}
              
              <div className="space-y-1.5 mb-6">
                <p className="text-[11px] font-bold text-muted-text uppercase tracking-wider">Included Services ({p.services?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.services?.map(s => (
                     <span key={s._id} className="text-[11px] px-2.5 py-1 bg-surface-variant text-on-surface border border-border rounded-lg truncate max-w-full">
                       {s.name}
                     </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex gap-2">
              <button onClick={() => openEditForm(p)} className="flex-1 text-xs py-2.5 font-medium text-on-surface bg-surface-variant hover:bg-surface-variant-hover border border-border rounded-xl transition-all flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Edit
              </button>
              <button onClick={() => handleToggleStatus(p._id)} className={`flex-1 text-xs py-2.5 font-medium border rounded-xl transition-all flex items-center justify-center gap-1 ${p.isActive ? 'text-warning bg-warning/10 border-warning/20 hover:bg-warning/20' : 'text-success bg-success/10 border-success/20 hover:bg-success/20'}`}>
                <span className="material-symbols-outlined text-[16px]">{p.isActive ? 'visibility_off' : 'visibility'}</span>
                {p.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => handleDelete(p._id)} className="flex-1 text-xs py-2.5 font-medium text-error bg-error/10 hover:bg-error/20 border border-error/20 rounded-xl transition-all flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
};
export default PackageManagePage;
