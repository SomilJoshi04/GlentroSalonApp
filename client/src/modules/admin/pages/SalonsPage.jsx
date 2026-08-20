import { useState, useEffect } from 'react';
import { getAllSalons, updateSalonStatus } from '../services/adminApi';
import AdminPageLayout from '../components/layout/AdminPageLayout';
import AdminPageHeader from '../components/layout/AdminPageHeader';
import DataTable from '../components/DataTable';

const SalonsPage = () => {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSalons = async () => {
    setLoading(true);
    try { 
      const r = await getAllSalons(); 
      setSalons(r.data.data.salons || r.data.data); 
    } catch (e) {} 
    setLoading(false);
  };

  useEffect(() => { fetchSalons(); }, []);

  const handleStatusChange = async (id, isApproved, isActive) => {
    try {
      await updateSalonStatus(id, { isApproved, isActive });
      fetchSalons();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update salon status');
    }
  };

  const columns = [
    { header: 'Name', render: (row) => <span className="font-medium text-on-surface">{row.name}</span> },
    { header: 'City', accessor: 'city' },
    { header: 'Vendor', render: (row) => row.vendor?.name || '-' },
    { header: 'Gender', render: (row) => <span className="capitalize">{row.gender}</span> },
    { header: 'Status', render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.isApproved ? (row.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger') : 'bg-warning/20 text-warning'}`}>
          {row.isApproved ? (row.isActive ? 'Active' : 'Suspended') : 'Pending'}
        </span>
      )
    },
    { header: 'Rating', render: (row) => (
        <div className="flex items-center text-muted-text">
          <span className="material-symbols-outlined text-[16px] text-rating mr-0.5">star</span>
          {row.ratings?.average?.toFixed(1) || '0.0'}
        </div>
      )
    },
    { header: 'Action', render: (row) => (
        !row.isApproved ? (
          <button onClick={() => handleStatusChange(row._id, true, true)} className="px-3 py-1.5 rounded-lg bg-success text-white font-medium text-xs hover:bg-success/80">Approve</button>
        ) : (
          <button onClick={() => handleStatusChange(row._id, true, !row.isActive)} className={`px-3 py-1.5 rounded-lg border font-medium text-xs ${row.isActive ? 'border-danger text-danger hover:bg-danger/10' : 'border-success text-success hover:bg-success/10'}`}>
            {row.isActive ? 'Suspend' : 'Activate'}
          </button>
        )
      )
    }
  ];

  return (
    <AdminPageLayout>
      <AdminPageHeader 
        title={`All Salons (${salons.length})`}
        description="View and manage all registered salons."
      />
      <DataTable 
        columns={columns}
        data={salons}
        loading={loading}
      />
    </AdminPageLayout>
  );
};
export default SalonsPage;
