import { useState, useEffect, useCallback } from 'react';
import { getAllBookings, getVendors } from '../services/adminApi';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import BookingDetailsModal from '../components/BookingDetailsModal';
import { format } from 'date-fns';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vendorFilter, setVendorFilter] = useState('');
  const [vendorsList, setVendorsList] = useState([]);
  
  // Date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });

  const [stats, setStats] = useState({
    all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0
  });

  const [selectedBooking, setSelectedBooking] = useState(null);

  // Fetch vendors for the dropdown
  useEffect(() => {
    const fetchVendorsList = async () => {
      try {
        const res = await getVendors({ limit: 1000 });
        if (res.data?.success) setVendorsList(res.data.data);
      } catch (err) {}
    };
    fetchVendorsList();
  }, []);

  const fetchBookings = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllBookings({ 
        page, 
        limit: pagination.limit, 
        search, 
        status: statusFilter,
        vendorId: vendorFilter,
        startDate,
        endDate
      });
      if (res.data?.success) {
        setBookings(res.data.data);
        setPagination({
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          total: res.data.total,
          limit: pagination.limit
        });

        // Update stats if we are on "All" tab (approximate way to get global stats, otherwise backend should return them)
        // For accurate stats, backend needs a stats endpoint. We'll simulate based on returned totals if on "All".
        if (statusFilter === 'All' && !search && !vendorFilter && !startDate && !endDate) {
           // We would ideally fetch real stats, but let's just show total for now
           setStats(prev => ({ ...prev, all: res.data.total }));
        }
      }
    } catch (err) {
      console.error("Failed to load bookings", err);
      setError('Unable to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, vendorFilter, startDate, endDate, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, statusFilter, vendorFilter, startDate, endDate, fetchBookings]);

  // Polling for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh current page
      fetchBookings(pagination.currentPage);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings, pagination.currentPage]);

  const tabs = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'];

  const columns = [
    {
      header: 'Booking ID / Date',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-headline-sm text-[14px] text-primary">#{row._id.slice(-6).toUpperCase()}</span>
          <span className="font-label-sm text-[12px] text-muted-text">
            {format(new Date(row.createdAt), 'MMM dd, yyyy')}
          </span>
        </div>
      )
    },
    {
      header: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center font-bold text-muted-text text-[12px]">
            {row.user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm text-[14px] text-on-surface line-clamp-1">{row.user?.name || 'Unknown'}</span>
            <span className="font-label-sm text-[12px] text-muted-text line-clamp-1">{row.user?.email || ''}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Salon',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface line-clamp-1">{row.salon?.name || 'Unknown'}</span>
          <span className="font-label-sm text-[12px] text-muted-text line-clamp-1">{row.salon?.city || ''}</span>
        </div>
      )
    },
    {
      header: 'Schedule',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-[14px] text-on-surface">
            {format(new Date(row.bookingDate), 'MMM dd, yyyy')}
          </span>
          <span className="font-label-sm text-[12px] text-muted-text">{row.startTime}</span>
        </div>
      )
    },
    {
      header: 'Services',
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.services.map((s, i) => (
            <span key={i} className="font-body-sm text-[13px] text-on-surface line-clamp-1">
              • {s.service?.name}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Total',
      render: (row) => (
        <span className="font-headline-sm text-[15px] text-on-surface font-bold">
          ₹{row.finalAmount?.toLocaleString() || row.totalAmount?.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <button 
          onClick={() => setSelectedBooking(row)}
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
          <h1 className="font-headline-md text-[28px] text-on-surface">Booking Management</h1>
          <p className="font-body-md text-muted-text mt-1">Monitor and manage all platform reservations in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl font-label-md text-[14px] text-on-surface hover:bg-surface-variant transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 border-b border-border">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2.5 rounded-t-xl font-label-md text-[14px] whitespace-nowrap transition-colors ${statusFilter === tab ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-text hover:bg-surface-variant hover:text-on-surface'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-text text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search customer name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2 pl-10 pr-4 text-[14px] outline-none transition-all"
          />
        </div>

        {/* Vendor Filter */}
        <div>
          <select 
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-[14px] outline-none focus:border-primary"
          >
            <option value="">All Salons</option>
            {vendorsList.map(v => (
              <option key={v._id} value={v._id}>{v.salon?.name || v.businessName || 'Unknown Salon'}</option>
            ))}
          </select>
        </div>

        {/* Date Filters */}
        <div>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-[14px] outline-none focus:border-primary text-muted-text"
          />
        </div>
        <div>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-[14px] outline-none focus:border-primary text-muted-text"
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={bookings} 
        loading={loading}
        error={error} 
        pagination={pagination}
        onPageChange={fetchBookings}
      />

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)} 
        />
      )}
    </div>
  );
};

export default BookingsPage;
