import { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory, getSubcategories, createSubcategory, deleteSubcategory } from '../services/adminApi';
import ImageUpload from '../../../components/common/ImageUpload';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catImage, setCatImage] = useState(null);
  const [subForm, setSubForm] = useState({ name: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => { 
    setLoading(true);
    setError(null);
    try { 
      const [c, s] = await Promise.all([getCategories(), getSubcategories()]); 
      setCategories(c.data.data); 
      setSubcategories(s.data.data); 
    } catch (e) {
      setError('Unable to load categories. Please try again.');
    } 
    setLoading(false); 
  };

  const handleCreateCat = async (e) => { 
    e.preventDefault(); 
    setSaving(true); 
    try { 
      const formData = new FormData();
      formData.append('name', catForm.name);
      formData.append('description', catForm.description);
      if (catImage) formData.append('image', catImage);
      
      await createCategory(formData); 
      setCatForm({ name: '', description: '' }); 
      setCatImage(null);
      load(); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to create category'); 
    } 
    setSaving(false); 
  };
  const handleCreateSub = async (e) => { e.preventDefault(); setSaving(true); try { await createSubcategory(subForm); setSubForm({ name: '', category: '' }); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false); };
  const handleDeleteCat = async (id) => { if (confirm('Delete?')) { try { await deleteCategory(id); load(); } catch (e) {} } };
  const handleDeleteSub = async (id) => { if (confirm('Delete?')) { try { await deleteSubcategory(id); load(); } catch (e) {} } };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;
  
  if (error) return <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-xl m-6">{error}</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <h1 className="text-2xl font-bold text-text-primary">Categories & Subcategories</h1>
      {/* Categories */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">Categories</h3>
        <form onSubmit={handleCreateCat} className="mb-6 space-y-4 max-w-xl">
          <div className="flex flex-col gap-4">
            <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="New category name *" required className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:border-primary-500 outline-none" />
            <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="Description (Optional)" className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm focus:border-primary-500 outline-none" />
            
            <ImageUpload 
              onFileSelect={setCatImage} 
              label="Category Image (Optional)"
              maxSizeMB={0.5}
            />
            
            <button type="submit" disabled={saving || !catForm.name} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 w-fit">
              {saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </form>
        <div className="space-y-2">
          {categories.length === 0 ? <p className="text-text-muted text-sm py-4">No categories found.</p> :
          categories.map(c => (
            <div key={c._id} className="flex justify-between items-center px-4 py-3 bg-surface-elevated rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                {c.image ? (
                  <img src={`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${c.image}`} alt={c.name} className="w-10 h-10 rounded-lg object-cover bg-background" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center text-muted-text">
                    <span className="material-symbols-outlined text-[20px]">category</span>
                  </div>
                )}
                <div>
                  <div className="text-text-primary font-medium">{c.name}</div>
                  <div className="text-xs text-text-muted line-clamp-1 max-w-[200px]">{c.description || 'No description'}</div>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${c.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <button onClick={() => handleDeleteCat(c._id)} className="text-danger p-2 hover:bg-danger/10 rounded-lg transition-colors" title="Delete Category">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Subcategories */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">Subcategories</h3>
        <form onSubmit={handleCreateSub} className="flex gap-2 mb-4">
          <select value={subForm.category} onChange={e => setSubForm({...subForm, category: e.target.value})} required className="px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm">
            <option value="">Select category</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} placeholder="Subcategory name" required className="flex-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" />
          <button type="submit" disabled={saving} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Add</button>
        </form>
        <div className="space-y-2">
          {subcategories.length === 0 ? <p className="text-text-muted text-sm py-4">No subcategories found.</p> :
          subcategories.map(s => (
            <div key={s._id} className="flex justify-between items-center px-4 py-3 bg-surface-elevated rounded-xl border border-border/50">
              <div>
                <span className="text-text-primary font-medium">{s.name}</span>
                <span className="ml-2 text-text-muted text-xs bg-surface-variant px-2 py-0.5 rounded-md">{s.category?.name}</span>
              </div>
              <button onClick={() => handleDeleteSub(s._id)} className="text-danger p-2 hover:bg-danger/10 rounded-lg transition-colors" title="Delete Subcategory">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CategoriesPage;
