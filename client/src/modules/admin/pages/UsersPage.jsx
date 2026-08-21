import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserStatus, getAccountRecoveryRequests, approveAccountRecovery, rejectAccountRecovery } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import AdminListToolbar from '../components/layout/AdminListToolbar';
import RecoveryRequestModal from '../components/RecoveryRequestModal';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active, deleted, recovery
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'recovery') {
        const res = await getAccountRecoveryRequests({ page, limit: pagination.limit, search, status: 'pending' });
        if (res.data?.success) {
          setRequests(res.data.data);
          setPagination({
            currentPage: res.data.currentPage,
            totalPages: res.data.totalPages,
            total: res.data.total,
            limit: pagination.limit
          });
        }
      } else {
        const res = await getUsers({ page, limit: pagination.limit, search, status: activeTab });
        if (res.data?.success) {
          setUsers(res.data.data);
          setPagination({
            currentPage: res.data.currentPage,
            totalPages: res.data.totalPages,
            total: res.data.total,
            limit: pagination.limit
          });
        }
      }
    } catch (err) {
      console.error("Failed to load data", err);
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, pagination.limit]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchData(1);
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(pagination.currentPage);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const res = await updateUserStatus(id, !currentStatus);
      if (res.data?.success) {
        fetchData(pagination.currentPage);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleApproveRecovery = async (id) => {
    try {
      const res = await approveAccountRecovery(id);
      if (res.data?.success) {
        setIsModalOpen(false);
        fetchData(pagination.currentPage);
      }
    } catch (err) {
      console.error("Failed to approve", err);
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleRejectRecovery = async (id, reason) => {
    try {
      const res = await rejectAccountRecovery(id, { adminNote: reason });
      if (res.data?.success) {
        setIsModalOpen(false);
        fetchData(pagination.currentPage);
      }
    } catch (err) {
      console.error("Failed to reject", err);
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const userColumns = [
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
      header: activeTab === 'deleted' ? 'Deleted Date' : 'Registration Date',
      render: (row) => (
        <span className="font-body-sm text-[14px] text-muted-text">
          {new Date(activeTab === 'deleted' ? (row.deleteAccount?.deletedAt || row.createdAt) : row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <StatusBadge status={activeTab === 'deleted' ? 'Deleted' : row.accountStatus === 'recovery_requested' ? 'Pending Recovery' : row.isActive ? 'Active' : 'Inactive'} />
      )
    },
    ...(activeTab === 'active' ? [{
      header: 'Actions',
      render: (row) => (
        <button 
          onClick={() => toggleUserStatus(row._id, row.isActive)}
          className={`px-3 py-1.5 rounded-lg font-label-sm text-[13px] border transition-colors ${row.isActive ? 'border-error text-error hover:bg-error/10' : 'border-success text-success hover:bg-success/10'}`}
        >
          {row.isActive ? 'Deactivate' : 'Activate'}
        </button>
      )
    }] : [])
  ];

  const recoveryColumns = [
    {
      header: 'User Details',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {row.userId?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-headline-sm text-[15px] text-on-surface">{row.userId?.name}</p>
            <span className="font-body-sm text-[13px] text-muted-text">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Reason',
      render: (row) => (
        <span className="font-body-sm text-[14px] text-on-surface line-clamp-2 max-w-xs" title={row.reason}>
          {row.reason}
        </span>
      )
    },
    {
      header: 'Requested On',
      render: (row) => (
        <span className="font-body-sm text-[14px] text-muted-text">
          {new Date(row.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <StatusBadge status="Pending" />
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button 
          onClick={() => {
            setSelectedRequest(row);
            setIsModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-lg font-label-sm text-[13px] border border-primary text-primary hover:bg-primary/10 transition-colors"
        >
          Review
        </button>
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title="User Management"
        description="Manage and monitor customer accounts."
        actions={
          <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl font-label-md text-[14px] text-on-surface hover:bg-surface-variant transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        }
      />

      <div className="mb-6 border-b border-border flex gap-6 px-6">
        <button 
          className={`py-3 font-semibold text-sm transition-colors relative ${activeTab === 'active' ? 'text-primary' : 'text-muted-text hover:text-on-surface'}`}
          onClick={() => setActiveTab('active')}
        >
          Active Users
          {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
        </button>
        <button 
          className={`py-3 font-semibold text-sm transition-colors relative ${activeTab === 'deleted' ? 'text-primary' : 'text-muted-text hover:text-on-surface'}`}
          onClick={() => setActiveTab('deleted')}
        >
          Deleted Users
          {activeTab === 'deleted' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
        </button>
        <button 
          className={`py-3 font-semibold text-sm transition-colors relative ${activeTab === 'recovery' ? 'text-primary' : 'text-muted-text hover:text-on-surface'}`}
          onClick={() => setActiveTab('recovery')}
        >
          Recovery Requests
          {activeTab === 'recovery' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
        </button>
      </div>

      <AdminListToolbar>
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
          />
        </div>
      </AdminListToolbar>

      <DataTable 
        columns={activeTab === 'recovery' ? recoveryColumns : userColumns} 
        data={activeTab === 'recovery' ? requests : users} 
        loading={loading}
        error={error} 
        pagination={pagination}
        onPageChange={fetchData}
      />

      <RecoveryRequestModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onApprove={handleApproveRecovery}
        onReject={handleRejectRecovery}
      />
    </AdminPageLayout>
  );
};

export default UsersPage;
