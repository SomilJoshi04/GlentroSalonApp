import { useState, useEffect, useRef } from 'react';
import { getBanners, createBanner, updateBanner, deleteBanner, toggleBannerStatus } from '../services/adminApi';
import ImageUpload from '../../../components/common/ImageUpload';

const BannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({ title: '', link: '' });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    try {
      const res = await getBanners();
      setBanners(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert('Please select an image');

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('link', form.link);
      formData.append('image', selectedFile);

      await createBanner(formData);
      
      // Reset form
      setForm({ title: '', link: '' });
      setSelectedFile(null);
      
      loadBanners();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to create banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteBanner(id);
        loadBanners();
      } catch (error) {
        alert('Failed to delete banner');
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleBannerStatus(id);
      loadBanners();
    } catch (error) {
      alert('Failed to toggle status');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Banner Management</h1>

      {/* Add New Banner */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">Add New Banner</h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title (Optional)</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:border-primary-500 focus:outline-none" placeholder="Summer Offer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Link (Optional)</label>
              <input type="text" value={form.link} onChange={e => setForm({...form, link: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:border-primary-500 focus:outline-none" placeholder="https://..." />
            </div>
          </div>

          <div>
            <ImageUpload 
              onFileSelect={setSelectedFile} 
              label="Banner Image *"
              maxSizeMB={1.5}
            />
          </div>

          <button type="submit" disabled={saving || !selectedFile} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Uploading...' : 'Upload Banner'}
          </button>
        </form>
      </div>

      {/* Existing Banners */}
      <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-semibold text-text-primary">Existing Banners</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated text-text-secondary uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Image</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {banners.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-text-muted">No banners found</td>
                </tr>
              )}
              {banners.map((banner) => (
                <tr key={banner._id} className="hover:bg-surface-elevated/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-32 h-16 rounded-lg overflow-hidden border border-border bg-dark-800">
                      <img src={`http://localhost:5000/uploads/${banner.image}`} alt={banner.title || 'Banner'} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-primary">{banner.title || '-'}</div>
                    <div className="text-xs text-text-muted mt-1 truncate max-w-[200px]">{banner.link || 'No link'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${banner.isActive ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleToggle(banner._id)} className="text-primary-500 hover:text-primary-400 font-medium mr-4">
                      {banner.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(banner._id)} className="text-danger hover:text-danger/80 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BannersPage;
