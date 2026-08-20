import { useState, useEffect } from 'react';
import { getPackages, approvePackage, rejectPackage, updatePackageAdmin, deletePackageAdmin } from '../services/adminApi';
import { getImageUrl } from '../../../utils/imageUtils';
import Pagination from '../../../components/common/Pagination';
import toast from 'react-hot-toast';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import AdminListToolbar from '../components/layout/AdminListToolbar';

const PackagesPage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [rejectionReason, setRejectionReason] = useState({});
  const [prioValues, setPrioValues] = useState({});

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  useEffect(() => { load(1); }, [filter]);
  
  const load = async (page = 1) => { 
    setLoading(true);
    setError(null);
    try { 
      const r = await getPackages({ status: filter, page, limit: pagination.limit }); 
      const data = r.data?.data;
      const list = data?.packages || data || [];
      setPackages(Array.isArray(list) ? list : []); 

      if (data && data.packages) {
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
      setError('Unable to load packages. Please try again.');
    } 
    setLoading(false); 
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') {
        await approvePackage(id);
        toast.success('Offer approved successfully');
      } else {
        const reason = rejectionReason[id] || 'Rejected by admin';
        await rejectPackage(id, { adminNote: reason });
        toast.success('Offer rejected');
      }
      
      const nextPage = (packages.length === 1 && pagination.currentPage > 1) 
        ? pagination.currentPage - 1 
        : pagination.currentPage;
      load(nextPage);
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Failed to process action'); 
    }
  };

  const handleToggleFeature = async (p) => {
    if (p.status !== 'ACTIVE') {
      toast.error('Only approved active offers can be featured');
      return;
    }
    try {
      const nextFeaturedState = !p.isFeatured;
      await updatePackageAdmin(p._id, { isFeatured: nextFeaturedState });
      toast.success(nextFeaturedState ? 'Offer marked as featured' : 'Offer removed from featured');
      load(pagination.currentPage);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update featured status');
    }
  };

  const handleToggleActive = async (p) => {
    try {
      const nextActiveState = !p.isActive;
      await updatePackageAdmin(p._id, { isActive: nextActiveState });
      toast.success(nextActiveState ? 'Offer activated' : 'Offer deactivated');
      load(pagination.currentPage);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update activation status');
    }
  };

  const handleUpdatePriority = async (id, val) => {
    if (val === undefined || val === '') return;
    try {
      await updatePackageAdmin(id, { priority: Number(val) });
      toast.success('Priority updated');
      load(pagination.currentPage);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update priority');
    }
  };

  const handleDeletePackage = async (id) => {
    if (confirm('Are you sure you want to permanently delete this package/offer? This action cannot be undone.')) {
      try {
        await deletePackageAdmin(id);
        toast.success('Package deleted successfully');
        
        const nextPage = (packages.length === 1 && pagination.currentPage > 1) 
          ? pagination.currentPage - 1 
          : pagination.currentPage;
        load(nextPage);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to delete package');
      }
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Offers & Packages Moderation"
        description="Review, approve, and manage promotional offers, bundles, and featured displays."
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4 shrink-0 mb-4">
        {['PENDING', 'ACTIVE', 'REJECTED'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              filter === f 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'bg-surface-card text-text-secondary border border-border hover:bg-surface-elevated'
            }`}
          >
            {f === 'ACTIVE' ? 'APPROVED' : f}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4">
          {packages.length === 0 ? (
            <div className="text-center py-16 bg-surface-card rounded-2xl border border-border">
              <span className="material-symbols-outlined text-[48px] text-text-muted/30">inventory_2</span>
              <p className="text-text-muted mt-2 font-medium text-sm">No packages found for the selected status.</p>
            </div>
          ) : (
            <>
              {packages.map(p => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isExpired = new Date(p.validTo) < today;
                const discountPercent = p.totalPrice > 0 ? Math.round(((p.totalPrice - p.discountedPrice) / p.totalPrice) * 100) : 0;

                return (
                  <div 
                    key={p._id} 
                    className={`bg-surface-card rounded-2xl p-5 border ${
                      isExpired ? 'border-danger/30 opacity-85 shadow-sm' : 'border-border shadow-sm hover:shadow-md'
                    } transition-all duration-300 flex flex-col lg:flex-row gap-5 items-stretch relative overflow-hidden`}
                  >
                    {/* Left Status Bar Line indicator */}
                    {p.status === 'ACTIVE' && !isExpired && <div className="absolute top-0 left-0 w-1.5 h-full bg-success"></div>}
                    {(p.status === 'REJECTED' || isExpired) && <div className="absolute top-0 left-0 w-1.5 h-full bg-error"></div>}
                    {p.status === 'PENDING' && !isExpired && <div className="absolute top-0 left-0 w-1.5 h-full bg-warning"></div>}

                    {/* Thumbnail Column */}
                    <div className="w-full lg:w-40 h-32 lg:h-auto rounded-xl bg-surface-elevated overflow-hidden shrink-0 border border-border/80 relative shadow-inner">
                      <img 
                        src={p.image ? getImageUrl(p.image) : (p.salon?.images?.[0] ? getImageUrl(p.salon.images[0]) : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80")}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        {discountPercent}% OFF
                      </div>
                    </div>

                    {/* Details Middle Column */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-text-primary text-lg leading-tight">{p.name}</h4>
                          {isExpired && (
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-danger/10 text-danger border border-danger/20">
                              Expired
                            </span>
                          )}
                          <span className="text-[11px] text-text-muted font-medium bg-surface-elevated px-2 py-0.5 rounded border border-border ml-auto lg:ml-0">
                            Created: {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="text-xs text-text-secondary mt-1.5 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-text-muted">store</span>
                            <strong>Salon:</strong> {p.salon?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-text-muted">person</span>
                            <strong>Vendor ID:</strong> {p.salon?.vendor || p.vendor?._id || 'Unknown'}
                          </span>
                        </p>

                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="text-xl font-extrabold text-primary-500">₹{p.discountedPrice}</span>
                          <span className="text-sm text-text-muted line-through font-medium">₹{p.totalPrice}</span>
                        </div>

                        {p.validFrom && p.validTo && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-text-secondary bg-surface-elevated px-2.5 py-1.5 rounded-xl border border-border inline-flex">
                            <span className="material-symbols-outlined text-[16px] text-text-muted">calendar_today</span>
                            <span>{new Date(p.validFrom).toLocaleDateString()} - {new Date(p.validTo).toLocaleDateString()}</span>
                          </div>
                        )}

                        {p.description && (
                          <p className="text-xs text-text-secondary mt-3 leading-relaxed border-l-2 border-border pl-2.5 italic">
                            {p.description}
                          </p>
                        )}
                      </div>

                      {/* Included Services pills list */}
                      {p.services?.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/60">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Includes ({p.services.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {p.services.map(s => (
                              <span key={s._id || s} className="text-[10px] px-2 py-0.5 bg-surface-elevated text-text-primary border border-border rounded">
                                {s.name || 'Service'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l border-border/80 pt-4 lg:pt-0 lg:pl-5 shrink-0 min-w-[220px]">
                      <div className="w-full space-y-4">
                        {filter === 'PENDING' ? (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAction(p._id, 'approve')} 
                                className="flex-1 py-2 bg-success text-white rounded-xl text-xs font-bold hover:bg-success-dark transition-all shadow-sm active:scale-95 duration-100 flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                Approve
                              </button>
                              <button 
                                onClick={() => handleAction(p._id, 'reject')} 
                                className="flex-1 py-2 bg-error text-white rounded-xl text-xs font-bold hover:bg-error/90 transition-all shadow-sm active:scale-95 duration-100 flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">cancel</span>
                                Reject
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Rejection reason..." 
                              className="w-full text-xs px-3 py-2 rounded-xl bg-surface-elevated border border-border text-text-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                              value={rejectionReason[p._id] || ''}
                              onChange={(e) => setRejectionReason({ ...rejectionReason, [p._id]: e.target.value })}
                            />
                          </div>
                        ) : p.status === 'REJECTED' ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                              <span className="font-semibold text-error text-xs flex items-center gap-1 mb-1">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                Rejection Reason
                              </span>
                              <p className="text-xs text-error/80 italic">{p.adminNote || 'No specific reason provided'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Active / Inactive Status Selector Toggle */}
                            <div className="flex items-center justify-between p-2.5 bg-surface-elevated rounded-xl border border-border text-xs">
                              <span className="font-semibold text-text-secondary">Status:</span>
                              <button 
                                onClick={() => handleToggleActive(p)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wider border ${
                                  p.isActive 
                                    ? 'bg-success/15 text-success border-success/30 hover:bg-success/20' 
                                    : 'bg-error/15 text-error border-error/30 hover:bg-error/20'
                                } transition-all uppercase`}
                              >
                                {p.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </div>

                            {/* Featured / Not Featured Toggle */}
                            <div className="flex items-center justify-between p-2.5 bg-surface-elevated rounded-xl border border-border text-xs">
                              <span className="font-semibold text-text-secondary flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                Featured:
                              </span>
                              <button 
                                onClick={() => handleToggleFeature(p)}
                                disabled={p.status !== 'ACTIVE' || !p.isActive}
                                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-wider border ${
                                  p.isFeatured 
                                    ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20' 
                                    : 'bg-text-muted/10 text-text-muted border-border hover:bg-surface-variant'
                                } transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {p.isFeatured ? 'Featured' : 'Standard'}
                              </button>
                            </div>

                            {/* Display Priority Order Input */}
                            <div className="flex items-center justify-between p-2.5 bg-surface-elevated rounded-xl border border-border text-xs">
                              <span className="font-semibold text-text-secondary">Priority:</span>
                              <input 
                                type="number" 
                                className="w-16 px-2 py-1 text-xs border border-border rounded bg-surface text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                                value={prioValues[p._id] !== undefined ? prioValues[p._id] : (p.priority || 0)}
                                onChange={(e) => setPrioValues({ ...prioValues, [p._id]: e.target.value })}
                                onBlur={() => handleUpdatePriority(p._id, prioValues[p._id])}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Admin Destructive deletion controls */}
                      <div className="w-full pt-4 mt-4 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] text-text-muted uppercase font-bold">
                          Status: <span className={p.status === 'ACTIVE' ? 'text-success' : p.status === 'REJECTED' ? 'text-error' : 'text-warning'}>{p.status === 'ACTIVE' ? 'APPROVED' : p.status}</span>
                        </span>
                        
                        <button 
                          onClick={() => handleDeletePackage(p._id)}
                          className="p-2 text-error hover:bg-error/10 transition-colors rounded-full active:scale-95 duration-100 flex items-center justify-center border border-transparent hover:border-error/25"
                          title="Delete Package"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={load}
              />
            </>
          )}
        </div>
      )}
    </AdminPageLayout>
  );
};

export default PackagesPage;
