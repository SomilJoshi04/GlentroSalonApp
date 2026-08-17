import { useState, useEffect, useCallback } from 'react';
import { getVendors, updateVendorStatus } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const VendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
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
      header: 'Salon',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-variant border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {row.salon?.logo ? (
              <img src={row.salon.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[24px] text-muted-text">storefront</span>
            )}
          </div>
          <div>
            <p className="font-headline-sm text-[15px] text-on-surface line-clamp-1">{row.salon?.name || row.businessName || 'N/A'}</p>
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
      header: 'Location',
      render: (row) => {
        const city = row.salon?.city || 'N/A';
        const address = row.salon?.address || '';
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
        <span className="font-body-sm text-[14px] font-bold text-on-surface">{row.totalBookings.toLocaleString()}</span>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
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
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">Vendor Management</h1>
          <p className="font-body-md text-muted-text mt-1">Manage and monitor salon partners across your network.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-label-md text-[14px] hover:bg-primary-600 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add New Salon
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search by salon name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {/* Data Table */}
      <DataTable 
        columns={columns} 
        data={vendors} 
        loading={loading} 
        pagination={pagination}
        onPageChange={fetchVendors}
      />
    </div>
  );
};

export default VendorsPage;
