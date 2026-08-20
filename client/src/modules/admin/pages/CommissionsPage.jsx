import { useState, useEffect } from 'react';
import { getCommissions, setCommission, getPlatformFee, updatePlatformFee, getVendors, deleteCommission } from '../services/adminApi';
import Pagination from '../../../components/common/Pagination';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';
const CommissionsPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [platformFee, setPlatformFee] = useState({ percentage: 0 });
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeForm, setFeeForm] = useState('');
  const [adminCommForm, setAdminCommForm] = useState('');
  const [commForm, setCommForm] = useState({ vendor: '', percentage: '' });
  const [saving, setSaving] = useState(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 5
  });

  useEffect(() => { load(1); }, []);

  const load = async (page = 1) => {
    try {
      const [c, p, v] = await Promise.all([
        getCommissions({ page, limit: pagination.limit }),
        getPlatformFee(),
        getVendors({ limit: 1000 })
      ]);
      
      const commData = c.data?.data;
      const list = commData?.commissions || commData || [];
      setCommissions(Array.isArray(list) ? list : []);

      if (commData && commData.commissions) {
        setPagination({
          currentPage: commData.page || page,
          totalPages: commData.totalPages || 1,
          total: commData.total || list.length,
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

      if (p.data.data) { 
        setPlatformFee(p.data.data); 
        setFeeForm(p.data.data.feePercentage !== undefined ? p.data.data.feePercentage : p.data.data.percentage); 
        setAdminCommForm(p.data.data.adminCommissionPercentage || 0);
      }
      
      const vendorData = v.data?.data;
      setVendors(Array.isArray(vendorData?.vendors) ? vendorData.vendors : (Array.isArray(vendorData) ? vendorData : []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFeeSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try { 
      await updatePlatformFee({ feePercentage: Number(feeForm), adminCommissionPercentage: Number(adminCommForm) }); 
      load(pagination.currentPage); 
      alert('Updated successfully'); 
    } catch (e) { 
      alert('Failed'); 
    } 
    setSaving(false);
  };

  const handleCommSubmit = async (e) => {
    e.preventDefault(); 
    setSaving(true);
    try { 
      await setCommission({ vendor: commForm.vendor, percentage: Number(commForm.percentage) }); 
      setCommForm({ vendor: '', percentage: '' }); 
      load(1); 
    } catch (e) { 
      alert('Failed'); 
    } 
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this custom rate?')) return;
    setSaving(true);
    try { 
      await deleteCommission(id); 
      const nextPage = (commissions.length === 1 && pagination.currentPage > 1)
        ? pagination.currentPage - 1
        : pagination.currentPage;
      load(nextPage); 
    } catch (e) { 
      alert('Failed to delete'); 
    } 
    setSaving(false);
  };


  const columns = [
    {
      header: 'Vendor',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-on-surface">{row.vendor?.name}</span>
          <span className="text-[12px] text-muted-text">{row.vendor?.businessName}</span>
        </div>
      )
    },
    {
      header: 'Custom Rate',
      render: (row) => <span className="font-bold text-primary">{row.percentage}%</span>
    },
    {
      header: 'Date Set',
      render: (row) => <span className="text-muted-text text-sm">{new Date(row.updatedAt).toLocaleDateString()}</span>
    },
    {
      header: 'Action',
      render: (row) => (
        <button 
          onClick={() => handleDelete(row._id)} 
          disabled={saving} 
          className="p-2 text-error hover:bg-error/10 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 ml-auto"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          <span className="text-sm font-medium">Remove</span>
        </button>
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Financial Settings"
        description="Manage global platform fees and custom vendor commissions."
      />

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6">
        {/* Global Financial Settings */}
        <div className="bg-surface rounded-2xl p-6 border border-border flex flex-col gap-6 shadow-sm">
          <h3 className="font-semibold text-on-surface border-b border-border pb-3">Global Settings</h3>
          <form onSubmit={handleFeeSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
              <div>
                <h4 className="font-medium text-on-surface">Global Platform Fee</h4>
                <p className="text-sm text-muted-text mt-1">Platform fee deducted per booking</p>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  value={feeForm} 
                  onChange={e => setFeeForm(e.target.value)} 
                  required 
                  className="w-24 pl-3 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-center font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text font-bold">%</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
              <div>
                <h4 className="font-medium text-on-surface">Global Admin Commission</h4>
                <p className="text-sm text-muted-text mt-1">Default commission deducted if vendor is on Commission plan</p>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  value={adminCommForm} 
                  onChange={e => setAdminCommForm(e.target.value)} 
                  required 
                  className="w-24 pl-3 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-center font-bold text-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text font-bold">%</span>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-border">
              <button 
                type="submit" 
                disabled={saving} 
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-[14px] font-bold shadow-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Custom Vendor Commissions */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-on-surface mb-4">Custom Vendor Rates</h3>
            <form onSubmit={handleCommSubmit} className="flex flex-col sm:flex-row gap-4">
              <select 
                value={commForm.vendor} 
                onChange={e => setCommForm({...commForm, vendor: e.target.value})} 
                required 
                className="flex-1 px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              >
                <option value="">Select Vendor</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>{v.name} - {v.businessName}</option>
                ))}
              </select>
              
              <div className="relative">
                <input 
                  type="number" 
                  value={commForm.percentage} 
                  onChange={e => setCommForm({...commForm, percentage: e.target.value})} 
                  placeholder="Custom rate" 
                  required 
                  className="w-32 pl-3 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-on-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text font-bold">%</span>
              </div>
              
              <button 
                type="submit" 
                disabled={saving} 
                className="px-6 py-2.5 bg-success text-white rounded-xl text-[14px] font-bold shadow-sm hover:bg-success/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                Set Custom Rate
              </button>
            </form>
          </div>

          <DataTable 
            columns={columns}
            data={commissions}
            loading={loading}
            pagination={pagination}
            onPageChange={load}
            emptyMessage="No custom rates configured"
          />
        </div>
      </div>
    </AdminPageLayout>
  );
};

export default CommissionsPage;
