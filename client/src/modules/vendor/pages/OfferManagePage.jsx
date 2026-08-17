import { useState, useEffect } from 'react';
import { getVendorOffers, createOffer, updateOffer, deleteOffer, getVendorSalons, getServices } from '../services/vendorApi';

const OfferManagePage = () => {
  const [offers, setOffers] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    try {
      const query = {};
      if (filters.search) query.search = filters.search;
      if (filters.status) query.status = filters.status;
      const r = await getVendorOffers(query);
      setOffers(r.data.data);
    } catch (e) {}
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

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Offers</h1>
        <button onClick={() => {
          setEditingOffer(null);
          setForm({ title: '', salon: salons.length > 0 ? salons[0]._id : '', description: '', discountType: 'percentage', discountValue: '', applicableServices: [], validFrom: '', validTo: '' });
          setShowForm(!showForm);
        }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-colors hover:bg-primary-dark">
          {showForm ? 'Cancel' : '+ Create Offer'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          type="text" 
          placeholder="Search offers by title..." 
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary" 
        />
        <select 
          value={filters.status}
          onChange={e => setFilters({...filters, status: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary">
          <option value="">All Status</option>
          <option value="PENDING">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 animate-fade-in">
          <h2 className="text-lg font-semibold">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h2>
          
          {editingOffer?.status === 'ACTIVE' && (
            <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm">
              <strong>Warning:</strong> Editing an active offer will return it to <strong>PENDING</strong> status and hide it from customers until re-approved by an Admin.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1 block">Title*</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
            <div><label className="text-sm font-medium mb-1 block">Salon*</label><select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, applicableServices: []})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"><option value="">Select</option>{salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Discount Type</label><select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"><option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option></select></div>
            <div>
              <label className="text-sm font-medium mb-1 block">Value*</label>
              <div className="relative">
                {form.discountType === 'flat' && <span className="absolute left-3 top-2.5 text-slate-500">₹</span>}
                <input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary ${form.discountType === 'flat' ? 'pl-7' : ''}`} />
                {form.discountType === 'percentage' && <span className="absolute right-3 top-2.5 text-slate-500">%</span>}
              </div>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Valid From*</label><input type="date" required value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
            <div><label className="text-sm font-medium mb-1 block">Valid To*</label><input type="date" required value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
          </div>

          {services.length > 0 ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Applicable Services (Leave empty to apply to all)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {services.map(s => (
                  <label key={s._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors text-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      checked={form.applicableServices.includes(s._id)} 
                      onChange={e => setForm({...form, applicableServices: e.target.checked ? [...form.applicableServices, s._id] : form.applicableServices.filter(x => x !== s._id)})} 
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-500">₹{s.price} • {s.duration} min</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : form.salon && (
             <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">No services found for this salon.</div>
          )}

          <div><label className="text-sm font-medium mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-primary" /></div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm shadow-primary/20">
              {saving ? 'Saving...' : editingOffer ? 'Update Offer' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {offers.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            <span className="text-4xl mb-3 block">🏷️</span>
            <p className="font-medium text-slate-700">No offers found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new offer.</p>
          </div>
        )}
        {offers.map(o => (
          <div key={o._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
            {o.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
            {o.status === 'REJECTED' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
            {o.status === 'PENDING' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>}
            
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-slate-800">{o.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{o.salon?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${statusColors[o.status]}`}>
                    {o.status}
                  </span>
                </div>
              </div>

              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold text-lg mb-4">
                {o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg">
                <div>
                  <span className="font-medium block text-slate-700">Valid From</span>
                  {new Date(o.validFrom).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium block text-slate-700">Valid To</span>
                  {new Date(o.validTo).toLocaleDateString()}
                </div>
              </div>

              {o.status === 'REJECTED' && o.adminNote && (
                <div className="mb-4 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">Rejection Reason:</span>
                  <p className="text-sm text-red-700">{o.adminNote}</p>
                </div>
              )}

              {o.description && <p className="text-sm text-slate-600 mb-4">{o.description}</p>}
              
              {o.applicableServices?.length > 0 && (
                <div className="space-y-1 mt-auto">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Applicable to ({o.applicableServices.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {o.applicableServices.map(s => (
                       <span key={s._id} className="text-[10px] px-2 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md truncate max-w-full">
                         {s.name}
                       </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-50 flex gap-0">
              <button onClick={() => openEditForm(o)} className="flex-1 text-xs py-3 font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">Edit Offer</button>
              <div className="w-px bg-slate-100"></div>
              <button onClick={() => handleDelete(o._id)} className="flex-1 text-xs py-3 font-medium text-red-500 bg-red-50/50 hover:bg-red-100 transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default OfferManagePage;
