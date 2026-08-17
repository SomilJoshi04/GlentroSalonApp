import { useState, useEffect } from 'react';
import { getVendorOffers, createOffer, deleteOffer, getVendorSalons, getServices } from '../services/vendorApi';

const OfferManagePage = () => {
  const [offers, setOffers] = useState([]);
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', salon: '', description: '', discountType: 'percentage', discountValue: '', applicableServices: [], validFrom: '', validTo: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [o, s] = await Promise.all([getVendorOffers(), getVendorSalons()]); setOffers(o.data.data); setSalons(s.data.data); } catch (e) {} setLoading(false); };
  useEffect(() => { if (form.salon) loadSvc(); }, [form.salon]);
  const loadSvc = async () => { try { const r = await getServices({ salon: form.salon }); setServices(r.data.data.services); } catch (e) {} };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await createOffer({ ...form, discountValue: Number(form.discountValue) }); setShowForm(false); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false);
  };

  const handleDelete = async (id) => { if (confirm('Delete?')) { try { await deleteOffer(id); load(); } catch (e) {} } };
  const statusColors = { PENDING: 'bg-yellow-100 text-yellow-700', ACTIVE: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Offers</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium">{showForm ? 'Cancel' : '+ Create Offer'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Title*</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Salon*</label><select value={form.salon} onChange={e => setForm({...form, salon: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="">Select</option>{salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
            <div><label className="text-sm font-medium">Discount Type</label><select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"><option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option></select></div>
            <div><label className="text-sm font-medium">Value*</label><input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Valid From</label><input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="text-sm font-medium">Valid To</label><input type="date" value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
          </div>
          <div><label className="text-sm font-medium">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none" /></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create Offer'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map(o => (
          <div key={o._id} className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-5 border border-primary-100">
            <div className="flex justify-between items-start">
              <div><h4 className="font-semibold">{o.title}</h4><p className="text-sm text-slate-500 mt-1">{o.salon?.name}</p></div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[o.status]}`}>{o.status}</span>
                <button onClick={() => handleDelete(o._id)} className="text-red-400 text-xs">Delete</button>
              </div>
            </div>
            <p className="mt-2 text-lg font-bold text-primary-600">{o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}</p>
            {o.description && <p className="text-sm text-slate-500 mt-1">{o.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
export default OfferManagePage;
