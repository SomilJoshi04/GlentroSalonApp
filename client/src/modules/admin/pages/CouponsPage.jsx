import { useState, useEffect } from 'react';
import { getCoupons, createCoupon, deleteCoupon } from '../services/adminApi';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';

const CouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discountType: 'percentage', discountValue: '', minPurchaseAmount: '0', maxDiscountAmount: '', validFrom: '', validTo: '', usageLimit: '', applicableToOffers: true });
  const [saving, setSaving] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 6
  });

  useEffect(() => { load(1); }, []);

  const load = async (page = 1) => { 
    setLoading(true);
    setError(null);
    try { 
      const r = await getCoupons({ page, limit: pagination.limit }); 
      const data = r.data?.data;
      const list = data?.coupons || data || [];
      setCoupons(Array.isArray(list) ? list : []); 

      if (data && data.coupons) {
        setPagination({
          currentPage: data.page,
          totalPages: data.totalPages,
          total: data.total,
          limit: pagination.limit
        });
      } else {
        setPagination({
          currentPage: 1,
          totalPages: 1,
          total: Array.isArray(list) ? list.length : 0,
          limit: pagination.limit
        });
      }
    } catch (e) {
      setError('Unable to load coupons. Please try again.');
    } 
    setLoading(false); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try { 
      await createCoupon({ 
        ...form, 
        code: form.code.toUpperCase(), 
        discountValue: Number(form.discountValue), 
        minPurchaseAmount: Number(form.minPurchaseAmount) 
      }); 
      setShowForm(false); 
      load(1); 
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed'); 
    } 
    setSaving(false);
  };

  const handleDelete = async (id) => { 
    if (confirm('Delete?')) { 
      try { 
        await deleteCoupon(id); 
        const nextPage = (coupons.length === 1 && pagination.currentPage > 1)
          ? pagination.currentPage - 1
          : pagination.currentPage;
        load(nextPage); 
      } catch (e) {} 
    } 
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Coupons"
        description="Manage discount codes and platform promotions."
        actions={
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-primary text-white rounded-xl text-[14px] font-medium shadow-sm hover:bg-primary-600 transition-colors">
            {showForm ? 'Cancel' : '+ Create Coupon'}
          </button>
        }
      />
      
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Coupon" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium text-text-secondary">Code*</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm uppercase" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Type</label><select value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm"><option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option></select></div>
            <div><label className="text-sm font-medium text-text-secondary">Value*</label><input type="number" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} required className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Min Purchase (₹)</label><input type="number" value={form.minPurchaseAmount} onChange={e => setForm({...form, minPurchaseAmount: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Valid From</label><input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div><label className="text-sm font-medium text-text-secondary">Valid To</label><input type="date" value={form.validTo} onChange={e => setForm({...form, validTo: e.target.value})} className="w-full mt-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-text-primary text-sm" /></div>
            <div className="col-span-1 sm:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="applicableToOffers" checked={form.applicableToOffers} onChange={e => setForm({...form, applicableToOffers: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-border" />
              <label htmlFor="applicableToOffers" className="text-sm font-medium text-text-primary cursor-pointer">Allow this coupon to be used on discounted Vendor Offers & Packages</label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
        </form>
      </Modal>

      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.length === 0 ? <p className="text-text-muted col-span-full py-8 text-center">No coupons found.</p> :
            coupons.map(c => (
              <div key={c._id} className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="px-3 py-1 bg-primary/10 text-primary font-extrabold tracking-wider rounded-lg border border-primary/20">{c.code}</div>
                  <button onClick={() => handleDelete(c._id)} className="text-error text-xs hover:text-error/80 flex items-center gap-1 font-medium"><span className="material-symbols-outlined text-[16px]">delete</span>Delete</button>
                </div>
                <p className="mt-4 text-2xl font-bold text-on-surface">{c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}</p>
                <p className="text-sm text-text-secondary mt-1">Min purchase: ₹{c.minPurchaseAmount}</p>
                <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs text-muted-text font-medium">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">confirmation_number</span> Used: {c.usedCount || 0} times</span>
                  <span className={`px-2 py-0.5 rounded ${c.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>{c.isActive ? 'Active' : 'Expired'}</span>
                </div>
                {!c.applicableToOffers && <div className="mt-3 text-[11px] text-warning bg-warning/10 px-2.5 py-1.5 rounded-lg inline-block font-medium">Not valid on offers</div>}
              </div>
            ))}
          </div>
          
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={load}
          />
        </div>
      )}
    </AdminPageLayout>
  );
};

export default CouponsPage;
