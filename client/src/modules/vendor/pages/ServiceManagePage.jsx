import { useState, useEffect } from 'react';
import { getVendorSalons, getServices, createService, updateService, deleteService, toggleServiceStatus, getCategories, getSubcategories } from '../services/vendorApi';
import Modal from '../../../components/common/Modal';

const ServiceManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', category: '', isActive: 'all' });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' });

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selectedSalon) loadServices(); }, [selectedSalon, filters]);
  useEffect(() => { if (form.category) loadSubs(); }, [form.category]);

  const loadInit = async () => {
    try {
      const [s, c] = await Promise.all([getVendorSalons(), getCategories()]);
      const loadedSalons = s.data.data;
      setSalons(loadedSalons); 
      setCategories(c.data.data);
      if (loadedSalons.length > 0) {
        const savedSalonId = localStorage.getItem('vendor_selected_salon');
        if (savedSalonId && loadedSalons.some(salon => salon._id === savedSalonId)) {
          setSelectedSalon(savedSalonId);
        } else {
          setSelectedSalon(loadedSalons[0]._id);
          localStorage.setItem('vendor_selected_salon', loadedSalons[0]._id);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  const loadServices = async () => { 
    setIsFetching(true);
    try { 
      const queryParams = { salon: selectedSalon };
      if (filters.search) queryParams.search = filters.search;
      if (filters.category) queryParams.category = filters.category;
      if (filters.isActive !== 'all') queryParams.isActive = filters.isActive;

      const r = await getServices(queryParams); 
      setServices(r.data.data.services); 
    } catch (e) {} 
    setIsFetching(false);
  };

  const loadSubs = async () => { 
    try { 
      const r = await getSubcategories({ category: form.category }); 
      setSubcategories(r.data.data); 
    } catch (e) {} 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        salon: selectedSalon, 
        price: Number(form.price), 
        duration: Number(form.duration) 
      };

      if (editingService) {
        await updateService(editingService._id, payload);
      } else {
        await createService(payload);
      }

      setShowForm(false); 
      setEditingService(null);
      setForm({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' });
      loadServices(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to save service'); 
    }
    setSaving(false);
  };

  const handleDelete = async (id) => { 
    if (confirm('Are you sure you want to delete this service?')) { 
      try { await deleteService(id); loadServices(); } catch (e) { alert('Failed to delete'); } 
    } 
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleServiceStatus(id);
      loadServices();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const openEditForm = (s) => {
    setEditingService(s);
    setForm({ 
      name: s.name, 
      category: s.category?._id || '', 
      subcategory: s.subcategory?._id || '', 
      gender: s.gender || 'unisex', 
      price: s.price, 
      duration: s.duration, 
      description: s.description || '' 
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-border" />
        <div className="h-96 bg-slate-100 rounded-2xl animate-pulse border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative max-w-5xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="font-headline-md text-[24px] sm:text-[28px] text-on-surface font-bold">Services</h1>
          <p className="font-body-md text-muted-text mt-1">Configure and manage your salon service catalog.</p>
        </div>
        <button onClick={() => {
          setEditingService(null);
          setForm({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' });
          setShowForm(!showForm);
        }} className={`w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Add Service'}
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <select value={selectedSalon} onChange={e => { setSelectedSalon(e.target.value); localStorage.setItem('vendor_selected_salon', e.target.value); }} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
          {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
        />
        
        <select 
          value={filters.category}
          onChange={e => setFilters({...filters, category: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        
        <select 
          value={filters.isActive}
          onChange={e => setFilters({...filters, isActive: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)}
        title={editingService ? 'Edit Service Details' : 'Create New Service'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-muted-text mb-1 block">Name*</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Category*</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value, subcategory: ''})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="">Select</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Subcategory</label>
              <select value={form.subcategory} onChange={e => setForm({...form, subcategory: e.target.value})} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="">Select</option>
                {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Gender Target</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="unisex">Unisex</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Price (₹)*</label>
              <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Duration (min)*</label>
              <input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-text mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        {isFetching ? (
          <div className="flex flex-col divide-y divide-border">
            <div className="h-[52px] bg-background-alt/50 border-b border-border"></div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-[72px] bg-surface-variant/30 animate-pulse w-full"></div>
            ))}
          </div>
        ) : services.length === 0 && !loading ? (
          <div className="py-16 text-center text-muted-text flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">content_cut</span>
            <p className="font-medium text-on-surface text-lg">No services found.</p>
            <p className="text-sm mt-1">Try adjusting filters or register a new service.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background-alt border-b border-border">
                <tr>
                  <th className="text-left px-5 py-4 text-muted-text font-semibold text-[13px]">Service</th>
                  <th className="text-left px-5 py-4 text-muted-text font-semibold text-[13px]">Category</th>
                  <th className="text-left px-5 py-4 text-muted-text font-semibold text-[13px]">Price</th>
                  <th className="text-left px-5 py-4 text-muted-text font-semibold text-[13px]">Duration</th>
                  <th className="text-left px-5 py-4 text-muted-text font-semibold text-[13px]">Status</th>
                  <th className="text-right px-5 py-4 text-muted-text font-semibold text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map(s => (
                  <tr key={s._id} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-5 py-4 font-semibold text-on-surface">
                      {s.name}
                      {s.gender !== 'unisex' && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 bg-soft-primary text-primary border border-primary/10 rounded-full uppercase tracking-wide">
                          {s.gender}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-on-surface">{s.category?.name || '-'}</td>
                    <td className="px-5 py-4 font-semibold text-on-surface">₹{s.price}</td>
                    <td className="px-5 py-4 text-muted-text">{s.duration} min</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${s.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEditForm(s)} title="Edit" className="p-1.5 text-muted-text hover:bg-surface-variant hover:text-primary rounded-lg transition-colors flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleToggleStatus(s._id)} title={s.isActive ? 'Disable' : 'Enable'} className={`p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0 ${s.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                          <span className="material-symbols-outlined text-[20px]">{s.isActive ? 'toggle_on' : 'toggle_off'}</span>
                        </button>
                        <button onClick={() => handleDelete(s._id)} title="Delete" className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ServiceManagePage;
