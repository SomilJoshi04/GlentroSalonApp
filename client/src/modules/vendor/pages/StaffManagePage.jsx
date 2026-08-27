import { useState, useEffect } from 'react';
import { getSalonStaff, getVendorStaff, addStaff, updateStaff, deleteStaff, updateSchedule, toggleStaffStatus } from '../services/vendorApi';
import { useBranch } from '../../../context/BranchContext';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';
import VendorListToolbar from '../../../components/vendor/layout/VendorListToolbar';
import VendorTableContainer from '../../../components/vendor/layout/VendorTableContainer';
import VendorPagination from '../../../components/vendor/layout/VendorPagination';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StaffManagePage = () => {
  const { selectedSalon, loadingBranches } = useBranch();
  const { confirm } = useConfirm();
  const [staff, setStaff] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

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

  useEffect(() => { loadStaff(1); }, [selectedSalon, filters]);

  const loadStaff = async (page = pagination.page) => { 
    setIsFetching(true);
    try { 
      const queryParams = { page, limit: pagination.limit };
      if (filters.search) queryParams.search = filters.search;
      if (filters.isActive !== 'all') queryParams.isActive = filters.isActive;
      
      let r;
      if (selectedSalon) {
        r = await getSalonStaff(selectedSalon._id, queryParams);
      } else {
        r = await getVendorStaff(queryParams);
      }
      
      if (r.data.data.staff) {
        setStaff(r.data.data.staff);
        setPagination(prev => ({ ...prev, page: r.data.data.page, total: r.data.data.total, totalPages: r.data.data.totalPages }));
      } else {
        setStaff(r.data.data);
      }
    } catch (e) {} 
    setIsFetching(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!selectedSalon) {
      toast.error("Please select a specific branch to add or edit staff.");
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        salon: selectedSalon._id, 
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
      toast.success('Staff saved successfully');
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to save staff'); 
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Are you sure you want to delete this staff member?'))) return;
    try { 
      await deleteStaff(id); 
      loadStaff(); 
      toast.success('Staff deleted');
    } catch (e) { 
      toast.error('Failed to delete'); 
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleStaffStatus(id);
      loadStaff();
      toast.success('Status updated');
    } catch (e) {
      toast.error('Failed to update status');
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
      toast.success('Availability updated');
    } catch (e) {
      toast.error('Failed to update availability');
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

  if (loadingBranches) {
    return (
      <VendorPageLayout>
        <div className="flex flex-col gap-6">
          <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
               <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
            ))}
          </div>
        </div>
      </VendorPageLayout>
    );
  }

  return (
    <VendorPageLayout>
      <VendorPageHeader 
        title="Staff Management"
        description="Manage your team members and schedule availability."
        actions={
          <button onClick={() => {
            setEditingStaff(null);
            setForm({ name: '', phone: '', specializations: '' });
            setShowForm(!showForm);
          }} className={`w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Add Staff'}
          </button>
        }
      />

      <VendorListToolbar>
        <div className="flex-1">
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="w-full px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
          />
        </div>
        <select 
          value={filters.isActive}
          onChange={e => setFilters({...filters, isActive: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
          <option value="all">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </VendorListToolbar>

      <Modal 
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingStaff ? 'Edit Staff Details' : 'Add New Staff Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-text">Name*</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-text">Phone*</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-text">Specializations <span className="text-muted-text/60 font-normal">(comma-separated)</span></label>
            <input type="text" value={form.specializations} onChange={e => setForm({...form, specializations: e.target.value})} placeholder="e.g. Haircut, Coloring, Facial" className="w-full px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>

      <VendorTableContainer isCardGrid={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {isFetching ? (
            Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="h-44 bg-surface rounded-2xl animate-pulse border border-border shadow-sm"></div>
            ))
          ) : staff.length === 0 && !isFetching ? (
            <div className="col-span-full py-16 text-center text-muted-text bg-surface rounded-2xl border border-border flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">group</span>
              <p className="font-medium text-on-surface text-lg">No staff members found.</p>
              <p className="text-sm mt-1">Try adjusting filters or register a new staff member.</p>
            </div>
          ) : (
            staff.map(s => (
            <div key={s._id} className="bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-soft-primary rounded-full flex items-center justify-center text-primary text-[15px] font-bold">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-on-surface text-sm">{s.name}</h4>
                      <p className="text-xs text-muted-text mt-0.5">{s.phone}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${s.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {s.specializations?.map(sp => (
                    <span key={sp} className="text-[10px] px-2.5 py-1 bg-background-alt text-muted-text border border-border rounded-md font-medium">
                      {sp}
                    </span>
                  ))}
                  {!s.specializations?.length && <span className="text-xs text-muted-text/60 italic">No specializations</span>}
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-border grid grid-cols-4 gap-2">
                <button onClick={() => openEditForm(s)} title="Edit" className="col-span-1 py-1.5 font-medium text-muted-text hover:bg-surface-variant rounded-lg transition-colors flex items-center justify-center border border-border">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => openAvailability(s)} className="col-span-2 text-xs py-1.5 font-semibold text-primary bg-soft-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center justify-center gap-1 border border-primary/10">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Availability
                </button>
                <button onClick={() => handleToggleStatus(s._id)} title={s.isActive ? 'Disable' : 'Enable'} className={`col-span-1 py-1.5 font-medium rounded-lg transition-colors border ${s.isActive ? 'border-error/20 text-error hover:bg-error/10' : 'border-success/20 text-success hover:bg-success/10'} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[18px]">{s.isActive ? 'toggle_on' : 'toggle_off'}</span>
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </VendorTableContainer>
      
      <VendorPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={loadStaff}
      />

      {/* Availability Modal */}
      {showAvailability && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in border border-border overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Manage Availability</h3>
                <p className="text-sm text-muted-text mt-0.5">{selectedStaffForAvailability?.name}</p>
              </div>
              <button onClick={() => setShowAvailability(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-muted-text transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {DAYS.map((day, index) => {
                const dayData = availabilityForm.find(d => d.dayOfWeek === index) || { dayOfWeek: index, isWorking: false, startTime: '10:00', endTime: '19:00' };
                return (
                  <div key={day} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-colors ${dayData.isWorking ? 'border-primary/20 bg-soft-primary/20' : 'border-border bg-background-alt'}`}>
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      <input 
                        type="checkbox" 
                        checked={dayData.isWorking} 
                        onChange={(e) => handleAvailabilityChange(index, 'isWorking', e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className={`font-semibold ${dayData.isWorking ? 'text-on-surface' : 'text-muted-text/50'}`}>{day}</span>
                    </div>
                    
                    {dayData.isWorking ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={dayData.startTime}
                          onChange={(e) => handleAvailabilityChange(index, 'startTime', e.target.value)}
                          className="px-3 py-1.5 bg-surface text-on-surface rounded-lg border border-border text-sm focus:border-primary outline-none shadow-sm"
                        />
                        <span className="text-muted-text">to</span>
                        <input 
                          type="time" 
                          value={dayData.endTime}
                          onChange={(e) => handleAvailabilityChange(index, 'endTime', e.target.value)}
                          className="px-3 py-1.5 bg-surface text-on-surface rounded-lg border border-border text-sm focus:border-primary outline-none shadow-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-text/55 font-medium px-4">Not Scheduled</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="px-6 py-5 border-t border-border flex justify-end gap-3 bg-background-alt">
              <button onClick={() => setShowAvailability(false)} className="px-6 py-2.5 font-medium text-muted-text hover:bg-surface-variant rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveAvailability} disabled={saving} className="px-8 py-2.5 font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </VendorPageLayout>
  );
};
export default StaffManagePage;
