import { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory, getSubcategories, createSubcategory, deleteSubcategory } from '../services/adminApi';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catForm, setCatForm] = useState('');
  const [subForm, setSubForm] = useState({ name: '', category: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [c, s] = await Promise.all([getCategories(), getSubcategories()]); setCategories(c.data.data); setSubcategories(s.data.data); } catch (e) {} setLoading(false); };

  const handleCreateCat = async (e) => { e.preventDefault(); setSaving(true); try { await createCategory({ name: catForm }); setCatForm(''); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false); };
  const handleCreateSub = async (e) => { e.preventDefault(); setSaving(true); try { await createSubcategory(subForm); setSubForm({ name: '', category: '' }); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); } setSaving(false); };
  const handleDeleteCat = async (id) => { if (confirm('Delete?')) { try { await deleteCategory(id); load(); } catch (e) {} } };
  const handleDeleteSub = async (id) => { if (confirm('Delete?')) { try { await deleteSubcategory(id); load(); } catch (e) {} } };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Categories & Subcategories</h1>
      {/* Categories */}
      <div className="bg-surface-card rounded-2xl p-6 border border-border">
        <h3 className="font-semibold text-text-primary mb-4">Categories</h3>
        <form onSubmit={handleCreateCat} className="flex gap-2 mb-4">
          <input value={catForm} onChange={e => setCatForm(e.target.value)} placeholder="New category name" required className="flex-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" />
          <button type="submit" disabled={saving} className="px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Add</button>
        </form>
        <div className="space-y-2">
          {categories.map(c => (
            <div key={c._id} className="flex justify-between items-center px-4 py-3 bg-surface-elevated rounded-xl">
              <div><span className="text-text-primary font-medium">{c.name}</span><span className={`ml-2 px-2 py-0.5 rounded text-xs ${c.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></div>
              <button onClick={() => handleDeleteCat(c._id)} className="text-danger text-xs hover:text-danger/80">Delete</button>
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
          {subcategories.map(s => (
            <div key={s._id} className="flex justify-between items-center px-4 py-3 bg-surface-elevated rounded-xl">
              <div><span className="text-text-primary font-medium">{s.name}</span><span className="ml-2 text-text-muted text-xs">({s.category?.name})</span></div>
              <button onClick={() => handleDeleteSub(s._id)} className="text-danger text-xs">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default CategoriesPage;
