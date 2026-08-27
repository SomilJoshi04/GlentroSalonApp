import { useState, useEffect } from 'react';
import { getVendorPackages, createPackage, updatePackage, deletePackage, togglePackageStatus, getVendorSalons, getServices } from '../services/vendorApi';
import Modal from '../../../components/common/Modal';
import { useBranch } from '../../../context/BranchContext';
import { getImageUrl } from '../../../utils/imageUtils';
import VendorPageLayout from '../../../components/vendor/layout/VendorPageLayout';
import VendorPageHeader from '../../../components/vendor/layout/VendorPageHeader';
import VendorListToolbar from '../../../components/vendor/layout/VendorListToolbar';
import VendorTableContainer from '../../../components/vendor/layout/VendorTableContainer';
import VendorPagination from '../../../components/vendor/layout/VendorPagination';
import { formatPaise, getRupeesFromPaise } from '../../../utils/money';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

const PackageManagePage = () => {
  const { selectedSalon, loadingBranches, salons } = useBranch();
  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const { confirm } = useConfirm();

  // Filters
  const [filters, setFilters] = useState({ search: '', status: '' });

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({ 
    name: '', salon: '', services: [], totalPrice: '', discountedPrice: '', description: '',
    validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: '' 
  });

  useEffect(() => { loadPackages(1); }, [filters, selectedSalon]);
  useEffect(() => { if (form.salon) loadServices(form.salon); }, [form.salon]);

  const loadPackages = async (page = pagination.page) => {
    setIsFetching(true);
    try {
      const query = { page, limit: pagination.limit };
      if (filters.search) query.search = filters.search;
      if (filters.status) query.status = filters.status;
      if (selectedSalon) query.salon = selectedSalon._id;
      
      const r = await getVendorPackages(query);
      if (r.data.data.packages) {
        setPackages(r.data.data.packages);
        setPagination(prev => ({ ...prev, page: r.data.data.page, total: r.data.data.total, totalPages: r.data.data.totalPages }));
      } else {
        setPackages(r.data.data);
      }
    } catch (e) {}
    setIsFetching(false);
  };

  const loadServices = async (salonId) => { 
    try { 
      const r = await getServices({ salon: salonId, isActive: 'all' }); 
      setServices(r.data.data.services); 
    } catch (e) {} 
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file size must be less than 2MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    // Date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validFromDate = new Date(form.validFrom);
    validFromDate.setHours(0, 0, 0, 0);

    const isNewValidFromDate = editingPackage && form.validFrom && editingPackage.validFrom
      ? form.validFrom !== new Date(editingPackage.validFrom).toISOString().split('T')[0]
      : true;

    if (!editingPackage || isNewValidFromDate) {
      if (validFromDate < today) {
        toast.error('Valid From date cannot be earlier than today.');
        return;
      }
    }

    if (form.validTo && new Date(form.validTo) < validFromDate) {
      toast.error('Valid To date cannot be earlier than Valid From date.');
      return;
    }

    setSaving(true);
    try { 
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('salon', form.salon);
      formData.append('totalPrice', Number(form.totalPrice));
      formData.append('discountedPrice', Number(form.discountedPrice));
      formData.append('description', form.description);
      formData.append('validFrom', form.validFrom);
      formData.append('validTo', form.validTo);
      formData.append('usageLimit', Number(form.usageLimit || 0));
      formData.append('perUserLimit', Number(form.perUserLimit || 0));
      formData.append('terms', form.terms);
      formData.append('services', JSON.stringify(form.services));
      if (imageFile) formData.append('image', imageFile);

      if (editingPackage) {
        await updatePackage(editingPackage._id, formData);
      } else {
        await createPackage(formData);
      }

      setShowForm(false); 
      setEditingPackage(null);
      setImageFile(null);
      setImagePreview('');
      setForm({ 
        name: '', salon: salons.length > 0 ? salons[0]._id : '', services: [], totalPrice: '', discountedPrice: '', description: '',
        validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: ''
      });
      loadPackages(); 
      toast.success('Offer saved successfully');
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to save offer/package'); 
    }
    setSaving(false);
  };

  const handleDelete = async (id) => { 
    if (!(await confirm('Are you sure you want to delete this offer/package?'))) return; 
    try { 
      await deletePackage(id); 
      loadPackages(); 
      toast.success('Offer deleted');
    } catch (e) { toast.error('Failed to delete'); } 
  };

  const handleToggleStatus = async (id) => {
    try {
      await togglePackageStatus(id);
      loadPackages();
      toast.success('Status updated');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const openEditForm = (p) => {
    setEditingPackage(p);
    setForm({
      name: p.name,
      salon: p.salon?._id || '',
      services: p.services?.map(s => s._id) || [],
      totalPrice: p.totalPricePaise ? getRupeesFromPaise(p.totalPricePaise) : p.totalPrice,
      discountedPrice: p.discountedPricePaise ? getRupeesFromPaise(p.discountedPricePaise) : p.discountedPrice,
      description: p.description || '',
      validFrom: p.validFrom ? new Date(p.validFrom).toISOString().split('T')[0] : '',
      validTo: p.validTo ? new Date(p.validTo).toISOString().split('T')[0] : '',
      usageLimit: p.usageLimit || 0,
      perUserLimit: p.perUserLimit || 0,
      terms: p.terms || ''
    });
    setImageFile(null);
    setImagePreview(p.image ? getImageUrl(p.image) : '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const statusColors = { 
    PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    ACTIVE: 'bg-green-100 text-green-700 border-green-200', 
    REJECTED: 'bg-red-100 text-red-700 border-red-200' 
  };

  if (loadingBranches) {
    return (
      <VendorPageLayout>
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      </VendorPageLayout>
    );
  }

  return (
    <VendorPageLayout>
      <VendorPageHeader 
        title="Offers & Packages"
        description="Create promotional offers or bundle multiple services together."
        actions={
          <button onClick={() => {
            setEditingPackage(null);
            setImageFile(null);
            setImagePreview('');
            setForm({ 
              name: '', salon: salons.length > 0 ? salons[0]._id : '', services: [], totalPrice: '', discountedPrice: '', description: '',
              validFrom: '', validTo: '', usageLimit: 0, perUserLimit: 0, terms: ''
            });
            setShowForm(!showForm);
          }} className={`w-full sm:w-auto shrink-0 justify-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border ${showForm ? 'bg-surface border-border text-on-surface hover:bg-surface-variant' : 'bg-primary text-white hover:bg-primary-dark border-transparent'}`}>
            <span className="material-symbols-outlined text-[18px]">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Create Offer/Package'}
          </button>
        }
      />

      <VendorListToolbar>
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search offers or packages by name..." 
            value={filters.search}
            onChange={e => setFilters({...filters, search: e.target.value})}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" 
          />
        </div>
        <select 
          value={filters.status}
          onChange={e => setFilters({...filters, status: e.target.value})}
          className="px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm min-w-[150px]">
          <option value="">All Status</option>
          <option value="PENDING">Pending Approval</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </VendorListToolbar>

      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={editingPackage ? 'Edit Offer/Package' : 'Create New Offer/Package'} 
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {editingPackage?.status === 'ACTIVE' && (
            <div className="p-3.5 bg-warning/10 text-warning-dark border border-warning/30 rounded-xl text-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-warning shrink-0">warning</span>
              <div>
                <strong>Warning:</strong> Editing an active offer/package will return it to <strong>PENDING</strong> status and hide it from customers until re-approved by an Admin.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Offer/Package Name*</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Salon*</label>
              <select value={form.salon} onChange={e => setForm({...form, salon: e.target.value, services: []})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm">
                <option value="">Select Salon</option>
                {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Original Price (₹)*</label>
              <input type="number" value={form.totalPrice} readOnly className="w-full px-3.5 py-2.5 bg-surface-variant text-on-surface rounded-xl border border-border text-sm shadow-sm cursor-not-allowed" />
              <p className="text-xs text-muted-text mt-1">Calculated automatically from selected services.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Offer Price (₹)*</label>
              <input type="number" value={form.discountedPrice} onChange={e => setForm({...form, discountedPrice: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid From*</label>
              <input type="date" min={(!editingPackage || (form.validFrom && form.validFrom >= new Date().toISOString().split('T')[0])) ? new Date().toISOString().split('T')[0] : undefined} value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Valid To*</label>
              <input type="date" min={form.validFrom || new Date().toISOString().split('T')[0]} value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} required className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Total Usage Limit</label>
              <input type="number" placeholder="0 for unlimited" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-text mb-1 block">Usage Limit Per User</label>
              <input type="number" placeholder="0 for unlimited" value={form.perUserLimit} onChange={e => setForm({...form, perUserLimit: e.target.value})} className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
            </div>
          </div>
          
          {services.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-muted-text mb-2 block">Included Services* (Select at least one)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {services.map(s => (
                  <label key={s._id} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-sm ${form.services.includes(s._id) ? 'bg-soft-primary/30 border-primary text-primary' : 'bg-surface border-border text-on-surface hover:bg-surface-variant'}`}>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary bg-surface"
                      checked={form.services.includes(s._id)} 
                      onChange={e => {
                        const newServices = e.target.checked ? [...form.services, s._id] : form.services.filter(x => x !== s._id);
                        const newTotal = newServices.reduce((sum, id) => {
                          const service = services.find(srv => srv._id === id);
                          const price = service ? (service.pricePaise ? getRupeesFromPaise(service.pricePaise) : service.price) : 0;
                          return sum + price;
                        }, 0);
                        setForm({...form, services: newServices, totalPrice: newTotal});
                      }} 
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-xs text-muted-text">{formatPaise(s.pricePaise, s.price)} • {s.duration} min</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : form.salon && (
             <div className="text-sm text-muted-text italic p-3.5 bg-soft-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
               <span className="material-symbols-outlined text-[18px]">info</span>
               No services found for this salon. Please add services first.
             </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-muted-text mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Describe what's included in this package..." className="w-full px-3.5 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-text mb-2 block">Offer Image</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-background-alt border border-border border-dashed rounded-2xl">
              <div className="w-20 h-20 rounded-xl bg-surface-variant overflow-hidden shrink-0 border border-border flex items-center justify-center text-muted-text relative shadow-sm">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[28px]">image</span>
                )}
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <input
                  type="file"
                  id="offer-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="offer-image"
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-variant cursor-pointer transition-all shadow-sm active:scale-95 duration-100"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </label>
                <p className="text-[10px] text-muted-text mt-1.5">Supports PNG, JPG, JPEG or WEBP (Max 2MB)</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-muted-text hover:text-on-surface text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={saving || form.services.length === 0} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary-dark transition-colors shadow-sm">
              {saving ? 'Saving...' : editingPackage ? 'Update Package' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </Modal>

      <VendorTableContainer isCardGrid={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isFetching ? (
            Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="h-[320px] bg-surface rounded-2xl animate-pulse border border-border shadow-sm"></div>
            ))
          ) : packages.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-text bg-surface rounded-2xl border border-border border-dashed flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">inventory_2</span>
              <p className="font-semibold text-on-surface">No offers or packages found</p>
              <p className="text-xs mt-1">Try adjusting your filters or create a new offer/package.</p>
            </div>
          ) : (
            packages.map(p => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isExpired = new Date(p.validTo) < today;

              return (
            <div key={p._id} className={`bg-surface rounded-2xl border ${isExpired ? 'border-error/30 opacity-80' : 'border-border'} shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative w-full max-w-[340px] mx-auto sm:max-w-[400px] sm:mx-0`}>
              {p.status === 'ACTIVE' && !isExpired && <div className="absolute top-0 left-0 w-1.5 h-[128px] bg-success z-10"></div>}
              {(p.status === 'REJECTED' || isExpired) && <div className="absolute top-0 left-0 w-1.5 h-[128px] bg-error z-10"></div>}
              {p.status === 'PENDING' && !isExpired && <div className="absolute top-0 left-0 w-1.5 h-[128px] bg-warning z-10"></div>}
              
              {/* Offer Visual Banner */}
              <div className="h-32 w-full relative overflow-hidden bg-surface-variant shrink-0 border-b border-border">
                <img
                  src={p.image ? getImageUrl(p.image) : (p.salon?.images?.[0] ? getImageUrl(p.salon.images[0]) : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80")}
                  alt={p.name}
                  className="object-cover w-full h-full"
                />
              </div>

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div>
                    <h4 className="font-bold text-on-surface text-base sm:text-[17px] leading-tight">{p.name}</h4>
                    <p className="text-[11px] sm:text-xs text-muted-text mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">store</span>
                      {p.salon?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider border bg-error/10 text-error border-error/20">
                        EXPIRED
                      </span>
                    ) : (
                      <>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider border ${statusColors[p.status]}`}>
                          {p.status === 'ACTIVE' ? 'APPROVED' : p.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold tracking-wider border ${p.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-surface-variant text-muted-text border-border'}`}>
                          {p.isActive ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl sm:text-[24px] font-bold text-primary">{formatPaise(p.discountedPricePaise, p.discountedPrice)}</span>
                  <span className="text-xs sm:text-sm text-muted-text line-through font-medium">{formatPaise(p.totalPricePaise, p.totalPrice)}</span>
                  <span className="text-[10px] sm:text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-lg ml-auto">
                    Save {Math.round((((p.totalPricePaise ? getRupeesFromPaise(p.totalPricePaise) : p.totalPrice) - (p.discountedPricePaise ? getRupeesFromPaise(p.discountedPricePaise) : p.discountedPrice)) / (p.totalPricePaise ? getRupeesFromPaise(p.totalPricePaise) : p.totalPrice)) * 100)}%
                  </span>
                </div>

                {p.status === 'REJECTED' && p.adminNote && (
                  <div className="mb-3 p-3 bg-error/5 border border-error/15 rounded-xl">
                    <span className="text-[10px] font-bold text-error uppercase tracking-wider block mb-0.5">Rejection Reason</span>
                    <p className="text-[11px] sm:text-xs text-error">{p.adminNote}</p>
                  </div>
                )}

                {p.validFrom && p.validTo && (
                  <div className="mb-3 flex items-center gap-2 text-[11px] sm:text-xs text-muted-text bg-surface-variant p-2 rounded-lg border border-border">
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">calendar_today</span>
                    <span>{new Date(p.validFrom).toLocaleDateString()} - {new Date(p.validTo).toLocaleDateString()}</span>
                  </div>
                )}

                {p.description && <p className="text-[13px] sm:text-sm text-muted-text mb-4 line-clamp-2 leading-relaxed">{p.description}</p>}
                
                <div className="space-y-1.5 mb-2">
                  <p className="text-[10px] sm:text-[11px] font-bold text-muted-text uppercase tracking-wider">Included Services ({p.services?.length || 0})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.services?.map(s => (
                       <span key={s._id} className="text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 bg-surface-variant text-on-surface border border-border rounded-lg truncate max-w-full">
                         {s.name}
                       </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-0 sm:pt-0 mt-auto flex gap-2">
                <button onClick={() => openEditForm(p)} className="flex-1 text-xs py-2.5 font-medium text-on-surface bg-surface-variant hover:bg-surface-variant-hover border border-border rounded-xl transition-all flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit
                </button>
                <button onClick={() => handleToggleStatus(p._id)} className={`flex-1 text-xs py-2.5 font-medium border rounded-xl transition-all flex items-center justify-center gap-1 ${p.isActive ? 'text-warning bg-warning/10 border-warning/20 hover:bg-warning/20' : 'text-success bg-success/10 border-success/20 hover:bg-success/20'}`}>
                  <span className="material-symbols-outlined text-[16px]">{p.isActive ? 'visibility_off' : 'visibility'}</span>
                  {p.isActive ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(p._id)} className="flex-1 text-xs py-2.5 font-medium text-error bg-error/10 hover:bg-error/20 border border-error/20 rounded-xl transition-all flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
            )
          }))}
        </div>
      </VendorTableContainer>
      
      <VendorPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={loadPackages}
      />
    </VendorPageLayout>
  );
};
export default PackageManagePage;
