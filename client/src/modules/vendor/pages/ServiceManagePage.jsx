import { useState, useEffect } from 'react';
import { getVendorSalons, getServices, createService, updateService, deleteService, toggleServiceStatus, getCategories, getSubcategories } from '../services/vendorApi';

const ServiceManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setSalons(s.data.data); 
      setCategories(c.data.data);
      if (s.data.data.length) setSelectedSalon(s.data.data[0]._id);
    } catch (e) {}
    setLoading(false);
  };

  const loadServices = async () => { 
    try { 
      const queryParams = { salon: selectedSalon };
      if (filters.search) queryParams.search = filters.search;
      if (filters.category) queryParams.category = filters.category;
      if (filters.isActive !== 'all') queryParams.isActive = filters.isActive;

      const r = await getServices(queryParams); 
      setServices(r.data.data.services); 
    } catch (e) {} 
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

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <button onClick={() => {
          setEditingService(null);
          setForm({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' });
          setShowForm(!showForm);
        }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
          {showForm ? 'Cancel' : '+ Add Service'}
        </button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary">
          {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        
        <input 
          type="text" 
          placeholder="Search by name..." 
          value={filters.search}
          onChange={e => setFilters({...filters, search: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary" 
        />
        
        <select 
          value={filters.category}
          onChange={e => setFilters({...filters, category: e.target.value})}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        
        <select 
          value={filters.isActive}
          onChange={e => setFilters({...filters, isActive: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary">
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4 animate-fade-in">
          <h2 className="text-lg font-semibold">{editingService ? 'Edit Service' : 'Create Service'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2 md:col-span-1"><label className="text-sm font-medium mb-1 block">Name*</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
            <div><label className="text-sm font-medium mb-1 block">Category*</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value, subcategory: ''})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"><option value="">Select</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Subcategory</label><select value={form.subcategory} onChange={e => setForm({...form, subcategory: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"><option value="">Select</option>{subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-medium mb-1 block">Gender</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary"><option value="unisex">Unisex</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Price (₹)*</label><input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
            <div><label className="text-sm font-medium mb-1 block">Duration (min)*</label><input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" /></div>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-primary" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {services.length === 0 && !loading ? (
          <div className="py-16 text-center text-slate-500">
            <span className="text-4xl mb-3 block">✂️</span>
            <p className="font-medium text-slate-700">No services found.</p>
            <p className="text-sm mt-1">Try adjusting filters or add a new service.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-4 text-slate-600 font-semibold">Service</th>
                  <th className="text-left px-5 py-4 text-slate-600 font-semibold">Category</th>
                  <th className="text-left px-5 py-4 text-slate-600 font-semibold">Price</th>
                  <th className="text-left px-5 py-4 text-slate-600 font-semibold">Duration</th>
                  <th className="text-left px-5 py-4 text-slate-600 font-semibold">Status</th>
                  <th className="text-right px-5 py-4 text-slate-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {services.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {s.name}
                      {s.gender !== 'unisex' && (
                        <span className="ml-2 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-wide">
                          {s.gender}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{s.category?.name || '-'}</td>
                    <td className="px-5 py-4 font-medium">₹{s.price}</td>
                    <td className="px-5 py-4 text-slate-500">{s.duration} min</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEditForm(s)} className="text-slate-400 hover:text-primary transition-colors font-medium">Edit</button>
                        <button onClick={() => handleToggleStatus(s._id)} className={`${s.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-600'} transition-colors font-medium`}>
                          {s.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-600 transition-colors font-medium">Delete</button>
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
