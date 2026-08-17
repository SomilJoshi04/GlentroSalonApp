import { useState, useEffect, useCallback } from 'react';
import { getServices } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ServiceDetailsModal from '../components/ServiceDetailsModal';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  const fetchServices = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getServices({ page, limit: pagination.limit, search });
      if (res.data?.success) {
        setServices(res.data.data);
        setPagination({
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.total,
          limit: pagination.limit
        });
      }
    } catch (err) {
      console.error("Failed to load services", err);
      setError('Unable to load services. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchServices]);

  const columns = [
    {
      header: 'Service Details',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-variant flex items-center justify-center shrink-0 overflow-hidden">
            {row.image ? (
              <img src={row.image} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[24px] text-muted-text">cut</span>
            )}
          </div>
          <div>
            <p className="font-headline-sm text-[15px] text-on-surface line-clamp-1">{row.name}</p>
            <p className="font-label-sm text-[12px] text-muted-text">{row.duration} mins • {row.gender}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Salon',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface line-clamp-1">{row.salon?.name || 'Unknown Salon'}</span>
          <span className="font-label-sm text-[12px] text-muted-text line-clamp-1">{row.salon?.city || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Category',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface">{row.category?.name || 'Uncategorized'}</span>
          {row.subcategory?.name && <span className="font-label-sm text-[12px] text-muted-text">{row.subcategory?.name}</span>}
        </div>
      )
    },
    {
      header: 'Price',
      render: (row) => (
        <span className="font-headline-sm text-[15px] font-bold text-on-surface">₹{row.price}</span>
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
          onClick={() => setSelectedService(row)}
          className="p-2 text-muted-text hover:bg-surface-variant rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">visibility</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[28px] text-on-surface">Services Catalog</h1>
          <p className="font-body-md text-muted-text mt-1">View all services offered by vendors across the platform.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search by service name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={services} 
        loading={loading}
        error={error} 
        pagination={pagination}
        onPageChange={fetchServices}
      />

      {/* Service Details Modal */}
      {selectedService && (
        <ServiceDetailsModal 
          service={selectedService} 
          onClose={() => setSelectedService(null)} 
        />
      )}
    </div>
  );
};

export default ServicesPage;
