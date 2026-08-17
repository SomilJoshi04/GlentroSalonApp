import { useState, useEffect } from 'react';
import { getVendorSalons, getSalonStaff, addStaff, updateStaff, deleteStaff } from '../services/vendorApi';

const StaffManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', specializations: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSalons(); }, []);
  useEffect(() => { if (selectedSalon) loadStaff(); }, [selectedSalon]);

  const loadSalons = async () => { try { const r = await getVendorSalons(); setSalons(r.data.data); if (r.data.data.length) setSelectedSalon(r.data.data[0]._id); } catch (e) {} setLoading(false); };
  const loadStaff = async () => { try { const r = await getSalonStaff(selectedSalon); setStaff(r.data.data); } catch (e) {} };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addStaff({ ...form, salon: selectedSalon, specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean) });
      setShowForm(false); setForm({ name: '', phone: '', specializations: '' }); loadStaff();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    try { await deleteStaff(id); loadStaff(); } catch (e) { alert('Failed to delete'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white">
        {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Specializations (comma-separated)</label><input type="text" value={form.specializations} onChange={e => setForm({...form, specializations: e.target.value})} placeholder="Haircut, Coloring, Facial" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Adding...' : 'Add Staff'}</button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s._id} className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-200 to-primary-400 rounded-full flex items-center justify-center text-white text-lg font-bold">{s.name.charAt(0)}</div>
                <div>
                  <h4 className="font-medium text-sm">{s.name}</h4>
                  <p className="text-xs text-slate-400">{s.phone}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {s.specializations?.map(sp => <span key={sp} className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">{sp}</span>)}
            </div>
            <p className={`text-xs mt-2 font-medium ${s.isActive ? 'text-green-600' : 'text-red-500'}`}>{s.isActive ? '● Active' : '● Inactive'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default StaffManagePage;
