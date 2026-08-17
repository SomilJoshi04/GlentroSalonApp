import { useState, useEffect } from 'react';
import { getVendorSalons, getSalonStaff, addStaff, updateStaff, deleteStaff, updateSchedule, toggleStaffStatus } from '../services/vendorApi';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StaffManagePage = () => {
  const [salons, setSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState('');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: '', isActive: 'all' });

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', specializations: '' });

  // Availability Modal
  const [showAvailability, setShowAvailability] = useState(false);
  const [availabilityForm, setAvailabilityForm] = useState([]);
  const [selectedStaffForAvailability, setSelectedStaffForAvailability] = useState(null);

  useEffect(() => { loadSalons(); }, []);
  useEffect(() => { if (selectedSalon) loadStaff(); }, [selectedSalon, filters]);

  const loadSalons = async () => { 
    try { 
      const r = await getVendorSalons(); 
      setSalons(r.data.data); 
      if (r.data.data.length) setSelectedSalon(r.data.data[0]._id); 
    } catch (e) {} 
    setLoading(false); 
  };

  const loadStaff = async () => { 
    try { 
      const queryParams = {};
      if (filters.search) queryParams.search = filters.search;
      if (filters.isActive !== 'all') queryParams.isActive = filters.isActive;
      
      const r = await getSalonStaff(selectedSalon, queryParams); 
      setStaff(r.data.data); 
    } catch (e) {} 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        salon: selectedSalon, 
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean) 
      };

      if (editingStaff) {
        await updateStaff(editingStaff._id, payload);
      } else {
        await addStaff(payload);
      }
      
      setShowForm(false); 
      setEditingStaff(null);
      setForm({ name: '', phone: '', specializations: '' }); 
      loadStaff();
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to save staff'); 
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try { 
      await deleteStaff(id); 
      loadStaff(); 
    } catch (e) { 
      alert('Failed to delete'); 
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleStaffStatus(id);
      loadStaff();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const openEditForm = (s) => {
    setEditingStaff(s);
    setForm({ 
      name: s.name, 
      phone: s.phone, 
      specializations: s.specializations?.join(', ') || '' 
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAvailability = (s) => {
    setSelectedStaffForAvailability(s);
    setAvailabilityForm(s.workingSchedule || []);
    setShowAvailability(true);
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await updateSchedule(selectedStaffForAvailability._id, { workingSchedule: availabilityForm });
      setShowAvailability(false);
      loadStaff();
    } catch (e) {
      alert('Failed to update availability');
    }
    setSaving(false);
  };

  const handleAvailabilityChange = (dayIndex, field, value) => {
    const newForm = [...availabilityForm];
    const index = newForm.findIndex(d => d.dayOfWeek === dayIndex);
    if (index !== -1) {
      newForm[index] = { ...newForm[index], [field]: value };
    }
    setAvailabilityForm(newForm);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={() => {
          setEditingStaff(null);
          setForm({ name: '', phone: '', specializations: '' });
          setShowForm(!showForm);
        }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <select value={selectedSalon} onChange={e => setSelectedSalon(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-primary">
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
          <h2 className="text-lg font-semibold">{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Name*</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Phone*</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Specializations <span className="text-slate-400 font-normal">(comma-separated)</span></label>
            <input type="text" value={form.specializations} onChange={e => setForm({...form, specializations: e.target.value})} placeholder="e.g. Haircut, Coloring, Facial" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {staff.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 border-dashed">
            <span className="text-4xl mb-3 block">👥</span>
            <p className="font-medium text-slate-700">No staff members found.</p>
            <p className="text-sm mt-1">Try adjusting filters or add a new staff member.</p>
          </div>
        )}
        {staff.map(s => (
          <div key={s._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center text-primary text-lg font-bold">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{s.name}</h4>
                    <p className="text-xs text-slate-500">{s.phone}</p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${s.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {s.specializations?.map(sp => (
                  <span key={sp} className="text-[10px] px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md font-medium">
                    {sp}
                  </span>
                ))}
                {!s.specializations?.length && <span className="text-xs text-slate-400 italic">No specializations</span>}
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={() => openEditForm(s)} className="col-span-1 text-xs py-1.5 font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">Edit</button>
              <button onClick={() => openAvailability(s)} className="col-span-2 text-xs py-1.5 font-medium text-primary bg-soft-primary hover:bg-primary/20 rounded-lg transition-colors">Availability</button>
              <button onClick={() => handleToggleStatus(s._id)} className={`col-span-1 text-xs py-1.5 font-medium rounded-lg transition-colors ${s.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>{s.isActive ? 'Disable' : 'Enable'}</button>
            </div>
          </div>
        ))}
      </div>

      {/* Availability Modal */}
      {showAvailability && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manage Availability</h3>
                <p className="text-sm text-slate-500">{selectedStaffForAvailability?.name}</p>
              </div>
              <button onClick={() => setShowAvailability(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {DAYS.map((day, index) => {
                const dayData = availabilityForm.find(d => d.dayOfWeek === index) || { dayOfWeek: index, isWorking: false, startTime: '10:00', endTime: '19:00' };
                return (
                  <div key={day} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-colors ${dayData.isWorking ? 'border-primary/20 bg-primary/5' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <input 
                        type="checkbox" 
                        checked={dayData.isWorking} 
                        onChange={(e) => handleAvailabilityChange(index, 'isWorking', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className={`font-semibold ${dayData.isWorking ? 'text-slate-800' : 'text-slate-400'}`}>{day}</span>
                    </div>
                    
                    {dayData.isWorking ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={dayData.startTime}
                          onChange={(e) => handleAvailabilityChange(index, 'startTime', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-primary outline-none"
                        />
                        <span className="text-slate-400">to</span>
                        <input 
                          type="time" 
                          value={dayData.endTime}
                          onChange={(e) => handleAvailabilityChange(index, 'endTime', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:border-primary outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 font-medium px-4">Not Working</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="px-6 py-5 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl bg-slate-50">
              <button onClick={() => setShowAvailability(false)} className="px-6 py-2.5 font-medium text-slate-600 hover:bg-slate-200 bg-slate-200/50 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveAvailability} disabled={saving} className="px-8 py-2.5 font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-primary/20">
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffManagePage;
