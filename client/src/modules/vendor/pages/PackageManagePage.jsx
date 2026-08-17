import { useState, useEffect } from 'react';
import { getVendorPackages, createPackage, deletePackage, getVendorSalons, getServices } from '../services/vendorApi';

const PackageManagePage = () => {
  const [packages, setPackages] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [p, s] = await Promise.all([getVendorPackages(), getVendorSalons()]); setPackages(p.data.data); setSalons(s.data.data); } catch (e) {} setLoading(false); };

  useEffect(() => { if (form.salon) loadServices(); }, [form.salon]);
  const loadServices = async () => { try { const r = await getServices({ salon: form.salon }); setServices(r.data.data.services); } catch (e) {} };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createPackage({ ...form, totalPrice: Number(form.totalPrice), discountedPrice: Number(form.discountedPrice) }); setShowForm(false); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => { if (confirm('Delete?')) { try { await deletePackage(id); load(); } catch (e) {} } };

  const statusColors = { PENDING: 'bg-yellow-100 text-yellow-700', ACTIVE: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Packages</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium">{showForm ? 'Cancel' : '+ Create Package'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Package Name*</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Salon*</label><select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, services: []})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="">Select</option>{salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-medium">Original Price (₹)*</label><input type="number" value={form.totalPrice} onChange={e => setForm({...form, totalPrice: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Discounted Price (₹)*</label><input type="number" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
          </div>
          {services.length > 0 && (
            <div><label className="text-sm font-medium mb-2 block">Select Services</label>
              <div className="grid grid-cols-2 gap-2">{services.map(s => (
                <label key={s._id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 text-sm">
                  <input type="checkbox" checked={form.services.includes(s._id)} onChange={e => setForm({...form, services: e.target.checked ? [...form.services, s._id] : form.services.filter(x => x !== s._id)})} />
                  {s.name} (₹{s.price})
                </label>
              ))}</div>
            </div>
          )}
          <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none" /></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create Package'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map(p => (
          <div key={p._id} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex justify-between items-start">
              <div><h4 className="font-semibold">{p.name}</h4><p className="text-sm text-slate-500 mt-1">{p.salon?.name}</p></div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[p.status]}`}>{p.status}</span>
                <button onClick={() => handleDelete(p._id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3"><span className="text-sm text-slate-400 line-through">₹{p.totalPrice}</span><span className="text-lg font-bold text-primary-600">₹{p.discountedPrice}</span></div>
            {p.description && <p className="text-sm text-slate-500 mt-2">{p.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
export default PackageManagePage;
