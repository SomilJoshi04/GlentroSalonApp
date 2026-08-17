import { useState, useEffect } from 'react';
import { getVendorPackages, createPackage, updatePackage, deletePackage, getVendorSalons, getServices } from '../services/vendorApi';

const PackageManagePage = () => {
  const [packages, setPackages] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [form, setForm] = useState({ name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '' });

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
    try {
      const query = {};
      if (filters.search) query.search = filters.search;
      if (filters.status) query.status = filters.status;
      const r = await getVendorPackages(query);
      setPackages(r.data.data);
    } catch (e) {}
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
      setForm({ name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '' });
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

  const openEditForm = (p) => {
    setEditingPackage(p);
    setForm({
      name: p.name,
      salon: p.salon?._id || '',
      services: p.services?.map(s => s._id) || [],
      totalPrice: p.totalPrice,
      discountedPrice: p.discountedPrice,
      description: p.description || ''
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
        <h1 className="text-2xl font-bold">Packages</h1>
        <button onClick={() => {
          setEditingPackage(null);
          setForm({ name: '', salon: salons.length > 0 ? salons[0]._id : '', services: [], totalPrice: '', discountedPrice: '', description: '' });
          setShowForm(!showForm);
        }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium transition-colors hover:bg-primary-dark">
          {showForm ? 'Cancel' : '+ Create Package'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input 
          type="text" 
          placeholder="Search packages by name..." 
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-5 shadow-sm animate-fade-in">
          <h2 className="text-lg font-semibold">{editingPackage ? 'Edit Package' : 'Create New Package'}</h2>
          
          {editingPackage?.status === 'ACTIVE' && (
            <div className="p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-sm">
              <strong>Warning:</strong> Editing an active package will return it to <strong>PENDING</strong> status and hide it from customers until re-approved by an Admin.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Package Name*</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Salon*</label>
              <select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, services: []})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary">
                <option value="">Select Salon</option>
                {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Original Price (₹)*</label>
              <input type="number" value={form.totalPrice} onChange={e => setForm({...form, totalPrice: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Discounted Price (₹)*</label>
              <input type="number" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          
          {services.length > 0 ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Included Services* (Select at least one)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {services.map(s => (
                  <label key={s._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors text-sm">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      checked={form.services.includes(s._id)} 
                      onChange={e => setForm({...form, services: e.target.checked ? [...form.services, s._id] : form.services.filter(x => x !== s._id)})} 
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
             <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg">No services found for this salon. Please add services first.</div>
          )}
          
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Describe what's included in this package..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-primary" />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving || form.services.length === 0} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm shadow-primary/20">
              {saving ? 'Saving...' : editingPackage ? 'Update Package' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {packages.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            <span className="text-4xl mb-3 block">📦</span>
            <p className="font-medium text-slate-700">No packages found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new package.</p>
          </div>
        )}
        {packages.map(p => (
          <div key={p._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
            {p.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
            {p.status === 'REJECTED' && <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>}
            {p.status === 'PENDING' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>}
            
            <div className="pl-2">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-slate-800">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.salon?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border ${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </div>
              </div>
              
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-primary">₹{p.discountedPrice}</span>
                <span className="text-sm text-slate-400 line-through font-medium mb-1">₹{p.totalPrice}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded ml-auto mb-1">
                  Save {Math.round(((p.totalPrice - p.discountedPrice) / p.totalPrice) * 100)}%
                </span>
              </div>

              {p.status === 'REJECTED' && p.adminNote && (
                <div className="mb-3 p-3 bg-red-50/50 border border-red-100 rounded-lg">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">Rejection Reason:</span>
                  <p className="text-sm text-red-700">{p.adminNote}</p>
                </div>
              )}

              {p.description && <p className="text-sm text-slate-600 mb-4 line-clamp-2">{p.description}</p>}
              
              <div className="space-y-1 mb-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Included Services ({p.services?.length || 0})</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.services?.map(s => (
                     <span key={s._id} className="text-[10px] px-2 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md truncate max-w-full">
                       {s.name}
                     </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pl-2 mt-auto pt-4 border-t border-slate-50 flex gap-3">
              <button onClick={() => openEditForm(p)} className="flex-1 text-xs py-2 font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">Edit Package</button>
              <button onClick={() => handleDelete(p._id)} className="flex-1 text-xs py-2 font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default PackageManagePage;
