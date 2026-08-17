import { useState, useEffect } from 'react';
import { getVendorSalons, createSalon, updateSalon } from '../services/vendorApi';
import LocationPicker from '../../../components/common/LocationPicker';

const SalonManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSalon, setEditingSalon] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', address: '', city: '', zone: '', phone: '', email: '', openingTime: '09:00', closingTime: '21:00', gender: 'unisex', latitude: '', longitude: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await getVendorSalons(); setSalons(r.data.data); } catch (e) {} setLoading(false); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingSalon) { await updateSalon(editingSalon._id, form); }
      else { await createSalon(form); }
      setShowForm(false); setEditingSalon(null); load();
      setForm({ name: '', description: '', address: '', city: '', zone: '', phone: '', email: '', openingTime: '09:00', closingTime: '21:00', gender: 'unisex', latitude: '', longitude: '' });
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const handleEdit = (s) => {
    setEditingSalon(s);
    setForm({ name: s.name, description: s.description || '', address: s.address, city: s.city || '', zone: s.zone || '', phone: s.phone, email: s.email || '', openingTime: s.openingTime, closingTime: s.closingTime, gender: s.gender, latitude: s.location?.coordinates?.[1] || '', longitude: s.location?.coordinates?.[0] || '' });
    setShowForm(true);
  };

  const fields = [
    { name: 'name', label: 'Salon Name', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'zone', label: 'Zone/Area' },
    { name: 'phone', label: 'Phone', required: true },
    { name: 'email', label: 'Email' },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Salons</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingSalon(null); }}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all">
          {showForm ? 'Cancel' : '+ Add Salon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 animate-fade-in">
          <h3 className="font-semibold">{editingSalon ? 'Edit Salon' : 'New Salon'}</h3>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-sm font-medium text-slate-800 mb-3">Location Mapping</h4>
            <LocationPicker 
              initialLat={form.latitude}
              initialLng={form.longitude}
              initialAddress={form.address}
              onLocationSelect={(lat, lng, address) => {
                setForm(prev => ({ ...prev, latitude: lat, longitude: lng, address: address }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Address (Auto-filled by map)</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
              <input type="text" value={form.latitude} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
              <input type="text" value={form.longitude} readOnly className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input type="text" value={form[f.name]} onChange={e => setForm({...form, [f.name]: e.target.value})} required={f.required}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm">
                <option value="unisex">Unisex</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Time</label>
              <input type="time" value={form.openingTime} onChange={e => setForm({...form, openingTime: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Closing Time</label>
              <input type="time" value={form.closingTime} onChange={e => setForm({...form, closingTime: e.target.value})}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Saving...' : editingSalon ? 'Update Salon' : 'Create Salon'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {salons.map(s => (
          <div key={s._id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.address}</p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-soft-primary text-primary-dark capitalize">{s.gender}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.isApproved ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {s.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
              <button onClick={() => handleEdit(s)} className="text-sm text-primary hover:text-primary-dark font-medium">Edit</button>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400">
              🕐 {s.openingTime} - {s.closingTime} | ⭐ {s.ratings?.average?.toFixed(1) || '0.0'} ({s.ratings?.count || 0})
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SalonManagePage;
