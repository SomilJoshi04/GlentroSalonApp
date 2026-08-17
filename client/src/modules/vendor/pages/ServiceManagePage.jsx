import { useState, useEffect } from 'react';
import { getVendorSalons, getServices, createService, deleteService, getCategories, getSubcategories } from '../services/vendorApi';

const ServiceManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadInit(); }, []);
  useEffect(() => { if (selectedSalon) loadServices(); }, [selectedSalon]);
  useEffect(() => { if (form.category) loadSubs(); }, [form.category]);

  const loadInit = async () => {
    const [s, c] = await Promise.all([getVendorSalons(), getCategories()]);
    setSalons(s.data.data); setCategories(c.data.data);
    if (s.data.data.length) setSelectedSalon(s.data.data[0]._id);
    setLoading(false);
  };
  const loadServices = async () => { try { const r = await getServices({ salon: selectedSalon }); setServices(r.data.data.services); } catch (e) {} };
  const loadSubs = async () => { try { const r = await getSubcategories({ category: form.category }); setSubcategories(r.data.data); } catch (e) {} };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createService({ ...form, salon: selectedSalon, price: Number(form.price), duration: Number(form.duration) }); setShowForm(false); loadServices(); setForm({ name: '', category: '', subcategory: '', gender: 'unisex', price: '', duration: '', description: '' }); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => { if (confirm('Delete?')) { try { await deleteService(id); loadServices(); } catch (e) {} } };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">{showForm ? 'Cancel' : '+ Add Service'}</button>
      </div>
      <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
        {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Name*</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Category*</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value, subcategory: ''})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="">Select</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
            <div><label className="text-sm font-medium">Subcategory</label><select value={form.subcategory} onChange={e => setForm({...form, subcategory: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="">Select</option>{subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-medium">Gender</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="unisex">Unisex</option><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label className="text-sm font-medium">Price (₹)*</label><input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Duration (min)*</label><input type="number" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none" /></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create Service'}</button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {services.length === 0 ? <p className="text-center py-8 text-slate-400">No services yet</p> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><th className="text-left px-4 py-3 text-slate-600">Service</th><th className="text-left px-4 py-3 text-slate-600">Category</th><th className="text-left px-4 py-3 text-slate-600">Price</th><th className="text-left px-4 py-3 text-slate-600">Duration</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {services.map(s => (
                <tr key={s._id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium">{s.name}</td><td className="px-4 py-3 text-slate-500">{s.category?.name}</td><td className="px-4 py-3">₹{s.price}</td><td className="px-4 py-3">{s.duration} min</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(s._id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button></td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default ServiceManagePage;
