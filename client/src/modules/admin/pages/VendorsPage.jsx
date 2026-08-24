import { useState, useEffect, useCallback } from 'react';
import { getVendors, updateVendorStatus } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import AdminListToolbar from '../components/layout/AdminListToolbar';
import VendorCreateModal from '../components/VendorCreateModal';
import VendorDetailsModal from '../components/VendorDetailsModal';

const VendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  const fetchVendors = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVendors({ page, limit: pagination.limit, search, status: statusFilter });
      if (res.data?.success) {
        setVendors(res.data.data);
        setPagination({
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.total,
          limit: pagination.limit
        });
      }
    } catch (err) {
      console.error("Failed to load vendors", err);
      setError('Unable to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchVendors]);

  const handleStatusChange = async (id, isApproved, isActive) => {
    try {
      const res = await updateVendorStatus(id, { isApproved, isActive });
      if (res.data?.success) {
        fetchVendors(pagination.currentPage);
      }
    } catch (err) {
      console.error("Failed to update vendor status", err);
    }
  };

  const columns = [
    {
      header: 'Vendor Business',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-variant border border-border flex items-center justify-center shrink-0 overflow-hidden text-muted-text">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div>
            <p className="font-headline-sm text-[15px] text-on-surface line-clamp-1">{row.businessName || 'N/A'}</p>
            <p className="font-label-sm text-[12px] text-muted-text">{row.salonCount} Salons</p>
          </div>
        </div>
      )
    },
    {
      header: 'Vendor',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface">{row.name}</span>
          <span className="font-label-sm text-[12px] text-muted-text">{row.email}</span>
        </div>
      )
    },
    {
      header: 'Location (Primary)',
      render: (row) => {
        const primarySalon = row.salons && row.salons.length > 0 ? row.salons[0] : null;
        const city = primarySalon?.city || 'N/A';
        const address = primarySalon?.address || '';
        return (
          <div className="flex flex-col">
            <span className="font-body-sm text-[14px] text-on-surface line-clamp-1">{city}</span>
            {address && <span className="font-label-sm text-[12px] text-muted-text line-clamp-1">{address}</span>}
          </div>
        );
      }
    },
    {
      header: 'Status',
      render: (row) => {
        let statusText = 'Pending';
        if (row.isApproved && row.isActive) statusText = 'Active';
        if (row.isApproved && !row.isActive) statusText = 'Suspended';
        return <StatusBadge status={statusText} />;
      }
    },
    {
      header: 'Plan',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-[12px]">
          <span className="material-symbols-outlined text-[14px]">star</span>
          {row.subscriptionPlan ? 'Subscription' : 'Commission'}
        </span>
      )
    },
    {
      header: 'Bookings',
      render: (row) => (
        <span className="font-body-sm text-[14px] font-bold text-on-surface">{(row.totalBookings || 0).toLocaleString()}</span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSelectedVendor(row)}
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors tooltip-trigger" 
            title="View Details"
          >
            <span className="material-symbols-outlined text-[20px]">visibility</span>
          </button>
          {!row.isApproved ? (
            <button 
              onClick={() => handleStatusChange(row._id, true, true)}
              className="px-3 py-1.5 rounded-lg bg-success text-white font-label-sm text-[12px] hover:bg-success-600 transition-colors shadow-sm"
            >
              Approve
            </button>
          ) : (
            <button 
              onClick={() => handleStatusChange(row._id, true, !row.isActive)}
              className={`px-3 py-1.5 rounded-lg border font-label-sm text-[12px] transition-colors ${row.isActive ? 'border-error text-error hover:bg-error/10' : 'border-success text-success hover:bg-success/10'}`}
            >
              {row.isActive ? 'Suspend' : 'Activate'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="Vendor Management"
        description="Manage and monitor salon partners across your network."
      />

      <AdminListToolbar>
        <div className="flex flex-col sm:flex-row justify-between w-full gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search by name, email or business..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <span className="font-label-md text-[14px] text-muted-text whitespace-nowrap">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background-alt border border-border rounded-xl px-3 py-2 text-[14px] outline-none focus:border-primary min-w-[120px]"
              >
                <option value="">All Vendors</option>
                <option value="active">Active</option>
                <option value="pending">Pending Approval</option>
                <option value="inactive">Suspended</option>
              </select>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Vendor
            </button>
          </div>
        </div>
      </AdminListToolbar>

      <DataTable 
        columns={columns} 
        data={vendors} 
        loading={loading}
        error={error} 
        pagination={pagination}
        onPageChange={fetchVendors}
      />
      
      <VendorCreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreated={() => fetchVendors(1)} 
      />
      
      <VendorDetailsModal 
        vendor={selectedVendor} 
        onClose={() => setSelectedVendor(null)} 
      />
    </AdminPageLayout>
  );
};

export default VendorsPage;
