import { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory, getSubcategories, createSubcategory, deleteSubcategory } from '../services/adminApi';
import ImageUpload from '../../../components/common/ImageUpload';
import Modal from '../../../components/common/Modal';
import { getImageUrl } from '../../../utils/imageUtils';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]); // For the select box
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [catImage, setCatImage] = useState(null);
  const [subForm, setSubForm] = useState({ name: '', category: '' });
  
  const [showCatForm, setShowCatForm] = useState(false);
  const [showSubForm, setShowSubForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [catPagination, setCatPagination] = useState({ currentPage: 1, totalPages: 1, total: 0, limit: 10 });
  const [subPagination, setSubPagination] = useState({ currentPage: 1, totalPages: 1, total: 0, limit: 10 });

  useEffect(() => { 
    fetchAllCatsForSelect();
    fetchCategories(1);
    fetchSubcategories(1);
  }, []);

  const fetchAllCatsForSelect = async () => {
    try {
      const allCatsRes = await getCategories({ limit: 1000 }); // Large limit to get all for dropdown
      if (allCatsRes.data?.success) {
         setAllCategories(allCatsRes.data.data.categories || allCatsRes.data.data);
      }
    } catch (e) {
      setError('Unable to load categories list.');
    }
  };

  const fetchCategories = async (page = 1) => {
    setLoadingCats(true);
    try {
      const res = await getCategories({ page, limit: catPagination.limit });
      if (res.data?.success) {
        if (res.data.data.categories) {
          setCategories(res.data.data.categories);
          setCatPagination(prev => ({
            ...prev,
            currentPage: res.data.data.page,
            totalPages: res.data.data.totalPages,
            total: res.data.data.total
          }));
        } else {
          setCategories(res.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingCats(false);
  };

  const fetchSubcategories = async (page = 1) => {
    setLoadingSubs(true);
    try {
      const res = await getSubcategories({ page, limit: subPagination.limit });
      if (res.data?.success) {
        if (res.data.data.subcategories) {
          setSubcategories(res.data.data.subcategories);
          setSubPagination(prev => ({
            ...prev,
            currentPage: res.data.data.page,
            totalPages: res.data.data.totalPages,
            total: res.data.data.total
          }));
        } else {
          setSubcategories(res.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSubs(false);
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
      setShowCatForm(false);
      fetchCategories(1);
      fetchAllCatsForSelect();
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to create category'); 
    } 
    setSaving(false); 
  };

  const handleCreateSub = async (e) => { 
    e.preventDefault(); 
    setSaving(true); 
    try { 
      await createSubcategory(subForm); 
      setSubForm({ name: '', category: '' }); 
      setShowSubForm(false); 
      fetchSubcategories(1); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed'); 
    } 
    setSaving(false); 
  };

  const handleDeleteCat = async (id) => { 
    if (confirm('Delete?')) { 
      try { 
        await deleteCategory(id); 
        fetchCategories(catPagination.currentPage); 
        fetchAllCatsForSelect();
      } catch (e) {} 
    } 
  };

  const handleDeleteSub = async (id) => { 
    if (confirm('Delete?')) { 
      try { 
        await deleteSubcategory(id); 
        fetchSubcategories(subPagination.currentPage); 
      } catch (e) {} 
    } 
  };

  const catColumns = [
    {
      header: 'Category',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={getImageUrl(row.image)} alt={row.name} className="w-10 h-10 rounded-lg object-cover bg-background" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center text-muted-text">
              <span className="material-symbols-outlined text-[20px]">category</span>
            </div>
          )}
          <div>
            <div className="text-on-surface font-medium">{row.name}</div>
            <div className="text-[12px] text-muted-text line-clamp-1 max-w-[250px]">{row.description || 'No description'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${row.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <button onClick={() => handleDeleteCat(row._id)} className="text-danger p-2 hover:bg-danger/10 rounded-lg transition-colors" title="Delete Category">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )
    }
  ];

  const subColumns = [
    {
      header: 'Subcategory',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-on-surface font-medium">{row.name}</span>
          <span className="text-[12px] text-muted-text">{row.category?.name || 'Unknown Category'}</span>
        </div>
      )
    },
    {
      header: 'Action',
      render: (row) => (
        <button onClick={() => handleDeleteSub(row._id)} className="text-danger p-2 hover:bg-danger/10 rounded-lg transition-colors" title="Delete Subcategory">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )
    }
  ];

  if (error) return <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-xl m-6">{error}</div>;

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Categories & Subcategories"
        description="Manage the classification of services."
      />
      
      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 min-w-0">
        
        {/* Categories Section */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-surface rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-semibold text-on-surface">Categories</h3>
            <button onClick={() => setShowCatForm(true)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              Add Category
            </button>
          </div>
          <DataTable 
            columns={catColumns}
            data={categories}
            loading={loadingCats}
            pagination={catPagination}
            onPageChange={fetchCategories}
          />
        </div>

        {/* Subcategories Section */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-surface rounded-2xl border border-border p-4">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="font-semibold text-on-surface">Subcategories</h3>
            <button onClick={() => setShowSubForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
              Add Subcategory
            </button>
          </div>
          <DataTable 
            columns={subColumns}
            data={subcategories}
            loading={loadingSubs}
            pagination={subPagination}
            onPageChange={fetchSubcategories}
          />
        </div>
        
      </div>

      <Modal isOpen={showCatForm} onClose={() => setShowCatForm(false)} title="Add Category" size="md">
        <form onSubmit={handleCreateCat} className="space-y-4">
          <div className="flex flex-col gap-4">
            <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="New category name *" required className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm focus:border-primary-500 outline-none" />
            <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} placeholder="Description (Optional)" className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm focus:border-primary-500 outline-none" />
            
            <ImageUpload 
              onFileSelect={setCatImage} 
              label="Category Image (Optional)"
              maxSizeMB={0.5}
            />
            
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setShowCatForm(false)} className="px-5 py-2.5 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !catForm.name} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {saving ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showSubForm} onClose={() => setShowSubForm(false)} title="Add Subcategory" size="md">
        <form onSubmit={handleCreateSub} className="flex flex-col gap-4">
          <select value={subForm.category} onChange={e => setSubForm({...subForm, category: e.target.value})} required className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm">
            <option value="">Select category</option>{allCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} placeholder="Subcategory name" required className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm" />
          
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowSubForm(false)} className="px-5 py-2.5 text-muted-text hover:bg-surface-variant rounded-xl text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Adding...' : 'Add Subcategory'}
            </button>
          </div>
        </form>
      </Modal>

    </AdminPageLayout>
  );
};
export default CategoriesPage;
