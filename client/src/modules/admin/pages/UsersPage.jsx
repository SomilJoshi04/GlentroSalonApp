import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserStatus } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
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

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsers({ page, limit: pagination.limit, search, status: statusFilter });
      if (res.data?.success) {
        setUsers(res.data.data);
        setPagination({
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.total,
          limit: pagination.limit
        });
      }
    } catch (err) {
      console.error("Failed to load users", err);
      setError('Unable to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pagination.limit]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchUsers]);

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const res = await updateUserStatus(id, !currentStatus);
      if (res.data?.success) {
        // Refresh current page
        fetchUsers(pagination.currentPage);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const columns = [
    {
      header: 'User Details',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {row.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-headline-sm text-[15px] text-on-surface">{row.name}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface">{row.email}</span>
          <span className="font-label-sm text-[12px] text-muted-text">{row.phone || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Bookings',
      render: (row) => (
        <span className="font-body-sm text-[14px]">
          <span className="font-bold text-on-surface">{row.totalBookings}</span> <span className="text-muted-text">Bookings</span>
        </span>
      )
    },
    {
      header: 'Registration Date',
      render: (row) => (
        <span className="font-body-sm text-[14px] text-muted-text">
          {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} />
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button 
          onClick={() => toggleUserStatus(row._id, row.isActive)}
          className={`px-3 py-1.5 rounded-lg font-label-sm text-[13px] border transition-colors ${row.isActive ? 'border-error text-error hover:bg-error/10' : 'border-success text-success hover:bg-success/10'}`}
        >
          {row.isActive ? 'Deactivate' : 'Activate'}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">User Management</h1>
          <p className="font-body-md text-muted-text mt-1">Manage and monitor customer accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl font-label-md text-[14px] text-on-surface hover:bg-surface-variant transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label-md text-[14px] text-muted-text whitespace-nowrap">Filter by Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background-alt border border-border rounded-xl px-3 py-2 text-[14px] outline-none focus:border-primary min-w-[120px]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={users} 
        loading={loading}
        error={error} 
        pagination={pagination}
        onPageChange={fetchUsers}
      />
    </div>
  );
};

export default UsersPage;
