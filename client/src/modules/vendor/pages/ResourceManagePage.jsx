import { useState, useEffect } from 'react';
import { useBranch } from '../../../context/BranchContext';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';
import Modal from '../../../components/common/Modal';
import api from '../../../services/api/axiosInstance';
import { getImageUrl } from '../../../utils/imageUtils';

const ResourceManagePage = () => {
  const { selectedSalon, loadingBranches } = useBranch();
  const [resources, setResources] = useState([]);
  const [jacuzziEnabled, setJacuzziEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'JACUZZI', status: 'ACTIVE' });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedSalon) {
      loadResources();
    }
  }, [selectedSalon]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vendor/salon/${selectedSalon._id}/resources`);
      setResources(data.data);
      setJacuzziEnabled(data.jacuzziEnabled);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleToggleJacuzzi = async (e) => {
    const enabled = e.target.checked;
    try {
      await api.put(`/salons/${selectedSalon._id}/jacuzzi-toggle`, { jacuzziEnabled: enabled });
      setJacuzziEnabled(enabled);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to toggle Jacuzzi setting');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('type', form.type);
      formData.append('status', form.status);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editingResource) {
        await api.put(`/vendor/resources/${editingResource._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post(`/vendor/salon/${selectedSalon._id}/resources`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowForm(false);
      setEditingResource(null);
      setForm({ name: '', type: 'JACUZZI', status: 'ACTIVE' });
      setImageFile(null);
      loadResources();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save resource');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to deactivate this resource?')) {
      try {
        await api.delete(`/vendor/resources/${id}`);
        loadResources();
      } catch (e) {
        alert('Failed to deactivate resource');
      }
    }
  };

  const openEdit = (r) => {
    setEditingResource(r);
    setForm({ name: r.name, type: r.type, status: r.status });
    setImageFile(null);
    setShowForm(true);
  };

  if (loadingBranches) return <VendorPageLayout><div className="animate-pulse h-96 bg-slate-100 rounded-2xl" /></VendorPageLayout>;

  if (!selectedSalon) {
    return (
      <VendorPageLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">storefront</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Please select a branch</h2>
          <p className="text-muted-text">You need to select a specific branch from the top menu to manage resources.</p>
        </div>
      </VendorPageLayout>
    );
  }

  return (
    <VendorPageLayout>
      <VendorPageHeader 
        title="Facilities & Resources"
        description="Manage physical resources like Jacuzzis for your salon branch."
        actions={
          <button onClick={() => {
            setEditingResource(null);
            setForm({ name: '', type: 'JACUZZI', status: 'ACTIVE' });
            setImageFile(null);
            setShowForm(!showForm);
          }} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            {showForm ? 'Cancel' : 'Add Resource'}
          </button>
        }
      />

      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-on-surface">Jacuzzi Feature</h3>
          <p className="text-sm text-muted-text">Enable or disable Jacuzzi services for this branch</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={jacuzziEnabled} onChange={handleToggleJacuzzi} className="sr-only peer" />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingResource ? 'Edit Resource' : 'Add Resource'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-text block mb-1">Name*</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" placeholder="e.g. Jacuzzi Room 1" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-text block mb-1">Type*</label>
            <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
              <option value="JACUZZI">Jacuzzi</option>
            </select>
          </div>
          {editingResource && (
            <div>
              <label className="text-sm font-medium text-muted-text block mb-1">Status*</label>
              <select required value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-text block mb-1">Resource Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => setImageFile(e.target.files[0])} 
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 hover:bg-surface-variant rounded-xl text-sm font-medium text-muted-text">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-10 text-center text-muted-text">Loading...</div>
        ) : resources.length === 0 ? (
          <div className="col-span-full py-10 text-center border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-text">No resources added yet.</p>
          </div>
        ) : (
          resources.map(r => (
            <div key={r._id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              {r.image && (
                <div className="w-full h-32 rounded-xl overflow-hidden mb-2 bg-slate-100">
                  <img src={getImageUrl(r.image)} alt={r.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-on-surface text-lg">{r.name}</h4>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mt-1 inline-block">{r.type}</span>
                </div>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md tracking-wider ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : r.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {r.status}
                </span>
              </div>
              
              <div className="flex gap-2 mt-auto pt-4 border-t border-border">
                <button onClick={() => openEdit(r)} className="flex-1 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                </button>
                {r.status === 'ACTIVE' && (
                  <button onClick={() => handleDelete(r._id)} className="flex-1 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">block</span> Deactivate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </VendorPageLayout>
  );
};

export default ResourceManagePage;
