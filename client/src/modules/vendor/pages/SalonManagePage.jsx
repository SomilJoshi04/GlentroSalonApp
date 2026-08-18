import { useState, useEffect } from 'react';
import { getVendorSalons, createSalon, updateSalon } from '../services/vendorApi';
import LocationPicker from '../../../components/common/LocationPicker';
import ImageUpload from '../../../components/common/ImageUpload';
import toast from 'react-hot-toast';

const SalonManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSalon, setEditingSalon] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', address: '', city: '', zone: '', phone: '', email: '', openingTime: '09:00', closingTime: '21:00', gender: 'unisex', latitude: '', longitude: '' });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const r = await getVendorSalons(); setSalons(r.data.data); } catch (e) {} setLoading(false); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const data = new FormData();
      Object.keys(form).forEach(key => data.append(key, form[key]));
      if (imageFile) data.append('image', imageFile);

      if (editingSalon) { await updateSalon(editingSalon._id, data); }
      else { await createSalon(data); }
      setShowForm(false); setEditingSalon(null); load();
      setForm({ name: '', description: '', address: '', city: '', zone: '', phone: '', email: '', openingTime: '09:00', closingTime: '21:00', gender: 'unisex', latitude: '', longitude: '' });
      setImageFile(null);
      toast.success(editingSalon ? 'Salon updated successfully.' : 'Salon created successfully.');
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Changes could not be saved. Please try again.'); 
    }
    setSaving(false);
  };

  const handleEdit = (s) => {
    setEditingSalon(s);
    setForm({ name: s.name, description: s.description || '', address: s.address, city: s.city || '', zone: s.zone || '', phone: s.phone, email: s.email || '', openingTime: s.openingTime, closingTime: s.closingTime, gender: s.gender, latitude: s.location?.coordinates?.[1] || '', longitude: s.location?.coordinates?.[0] || '' });
    setImageFile(null);
    setShowForm(true);
  };

  const fields = [
    { name: 'name', label: 'Salon Name', required: true },
    { name: 'city', label: 'City', required: true },
    { name: 'zone', label: 'Zone/Area' },
    { name: 'phone', label: 'Phone', required: true },
    { name: 'email', label: 'Email' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2].map(i => (
             <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface font-bold">My Salons</h1>
          <p className="font-body-md text-muted-text mt-1">Manage and edit your salon profiles and map location.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingSalon(null); setImageFile(null); }}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border shrink-0 ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
          <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Add Salon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 border border-border space-y-5 animate-fade-in shadow-sm">
          <h3 className="font-semibold text-lg text-on-surface">{editingSalon ? 'Edit Salon Profile' : 'Register New Salon'}</h3>
          
          <div className="mb-4 p-4 border border-border rounded-xl bg-background-alt">
            <h4 className="text-sm font-medium text-on-surface mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-muted-text">image</span>
              Salon Banner Image
            </h4>
            <ImageUpload 
              currentImage={editingSalon?.images?.[0]} 
              onFileSelect={(file) => setImageFile(file)} 
              label=""
            />
          </div>

          <div className="bg-background-alt p-4 rounded-xl border border-border">
            <h4 className="text-sm font-medium text-on-surface mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-muted-text">map</span>
              Geographical Mapping
            </h4>
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
              <label className="block text-sm font-medium text-muted-text mb-1">Detailed Address (Auto-filled by map)</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} required
                className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-muted-text mb-1">Latitude</label>
              <input type="text" value={form.latitude} readOnly className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-background-alt text-muted-text cursor-not-allowed" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-muted-text mb-1">Longitude</label>
              <input type="text" value={form.longitude} readOnly className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-background-alt text-muted-text cursor-not-allowed" />
            </div>
            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-muted-text mb-1">{f.label}</label>
                <input type="text" value={form[f.name]} onChange={e => setForm({...form, [f.name]: e.target.value})} required={f.required}
                  className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-muted-text mb-1">Gender Focus</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="unisex">Unisex</option><option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-text mb-1">Opening Time</label>
              <input type="time" value={form.openingTime} onChange={e => setForm({...form, openingTime: e.target.value})}
                className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-text mb-1">Closing Time</label>
              <input type="time" value={form.closingTime} onChange={e => setForm({...form, closingTime: e.target.value})}
                className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-text mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none shadow-sm" />
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving...' : editingSalon ? 'Update Salon' : 'Register Salon'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {salons.map(s => (
          <div key={s._id} className="bg-surface rounded-2xl p-5 border border-border hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 shadow-sm">
            <div className="w-full sm:w-24 h-24 rounded-xl bg-background-alt border border-border overflow-hidden shrink-0">
              {s.images?.[0] ? (
                <img src={s.images[0].startsWith('http') || s.images[0].startsWith('data:') ? s.images[0] : `${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${s.images[0]}`} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-text/40"><span className="material-symbols-outlined text-3xl">storefront</span></div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-on-surface text-[16px]">{s.name}</h3>
                  <p className="text-xs text-muted-text mt-1 line-clamp-1">📍 {s.address}</p>
                  <div className="flex gap-2 mt-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold border border-primary/10 bg-soft-primary text-primary capitalize">{s.gender}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${s.isApproved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                      {s.isApproved ? 'Approved' : 'Pending Approval'}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleEdit(s)} className="p-2 text-primary hover:bg-soft-primary rounded-lg transition-colors flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-text flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {s.openingTime} - {s.closingTime}
                </span>
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <span className="material-symbols-outlined text-[14px] fill-current">star</span>
                  {s.ratings?.average?.toFixed(1) || '0.0'} ({s.ratings?.count || 0})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SalonManagePage;
