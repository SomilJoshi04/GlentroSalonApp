import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getVendorSalons, getSalonBookings, acceptBooking, rejectBooking, completeBooking } from '../services/vendorApi';

const statusColors = { PENDING: 'bg-yellow-100 text-yellow-700', CONFIRMED: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700', REJECTED: 'bg-gray-100 text-gray-700' };

const BookingManagePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [salons, setSalons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const navigate = useNavigate();

  const selectedSalon = searchParams.get('salon') || '';
  const filter = searchParams.get('status') || '';

  const handleSalonChange = (val) => {
    if (val) localStorage.setItem('vendor_selected_salon', val);
    else localStorage.removeItem('vendor_selected_salon');
    setSearchParams(prev => {
      if (val) prev.set('salon', val); else prev.delete('salon');
      return prev;
    }, { replace: true });
  };

  const handleFilterChange = (val) => {
    setSearchParams(prev => {
      if (val) prev.set('status', val); else prev.delete('status');
      return prev;
    }, { replace: true });
  };

  useEffect(() => { loadSalons(); }, []);
  useEffect(() => { if (selectedSalon) loadBookings(); }, [selectedSalon, filter]);

  const loadSalons = async () => { 
    try { 
      const r = await getVendorSalons(); 
      const loadedSalons = r.data.data;
      setSalons(loadedSalons); 
      
      if (loadedSalons.length > 0) {
        const currentSalonId = searchParams.get('salon');
        const savedSalonId = localStorage.getItem('vendor_selected_salon');
        
        if (currentSalonId && loadedSalons.some(s => s._id === currentSalonId)) {
          localStorage.setItem('vendor_selected_salon', currentSalonId);
        } else {
          const fallbackId = (savedSalonId && loadedSalons.some(s => s._id === savedSalonId))
            ? savedSalonId 
            : loadedSalons[0]._id;
          
          setSearchParams(prev => {
            prev.set('salon', fallbackId);
            return prev;
          }, { replace: true });
          localStorage.setItem('vendor_selected_salon', fallbackId);
        }
      }
    } catch (e) {} 
    setLoading(false); 
  };
  
  const loadBookings = async () => { 
    setIsFetching(true);
    try { 
      const params = filter ? { status: filter } : {}; 
      const r = await getSalonBookings(selectedSalon, params); 
      setBookings(r.data.data.bookings); 
    } catch (e) {} 
    setIsFetching(false);
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'accept') await acceptBooking(id);
      else if (action === 'reject') await rejectBooking(id, { reason: 'Rejected by vendor' });
      else if (action === 'complete') await completeBooking(id);
      loadBookings();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
             <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse border border-border"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto w-full pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface font-bold">Bookings</h1>
        <p className="font-body-md text-muted-text mt-1">Manage, approve, and track your salon appointments.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <select value={selectedSalon} onChange={e => handleSalonChange(e.target.value)} className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-border text-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shrink-0 shadow-sm">
          {salons.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
          {['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(f => (
            <button key={f} onClick={() => handleFilterChange(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${filter === f ? 'bg-soft-primary text-primary border-primary/20 font-bold shadow-sm' : 'bg-surface border-border text-muted-text hover:bg-surface-variant hover:text-on-surface'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => (
             <div key={i} className="h-44 bg-surface rounded-2xl animate-pulse border border-border shadow-sm"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border flex flex-col items-center">
          <span className="material-symbols-outlined text-4xl text-muted-text/30 mb-2">calendar_today</span>
          <h3 className="text-lg font-semibold text-on-surface">No bookings found</h3>
          <p className="text-muted-text text-sm mt-1">Appointments will appear here once customers book a service.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map(b => (
            <div key={b._id} className="bg-surface rounded-2xl p-5 border border-border hover:shadow-md transition-all flex flex-col shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/vendor/booking/${b._id}`)}>
                  <h4 className="font-semibold text-on-surface text-[16px] hover:text-primary transition-colors truncate">{b.user?.name || 'Customer'}</h4>
                  <div className="flex items-center text-sm text-muted-text mt-2 truncate">
                    <span className="material-symbols-outlined text-[16px] text-muted-text/75 mr-1.5">calendar_today</span>
                    <span>{new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {b.startTime}-{b.endTime}</span>
                  </div>
                  <p className="text-xs text-muted-text mt-1.5 truncate">✉️ {b.user?.email}</p>
                  <p className="text-xs text-muted-text truncate">📞 {b.user?.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[b.status]}`}>{b.status}</span>
                  <p className="text-sm font-semibold text-on-surface mt-2">₹{b.finalAmount}</p>
                </div>
              </div>
              {b.status === 'PENDING' && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-border">
                  <button onClick={() => handleAction(b._id, 'accept')} className="flex-1 py-2 bg-success/10 border border-success/30 text-success rounded-xl text-sm font-medium hover:bg-success hover:text-white transition-all shadow-sm">Accept</button>
                  <button onClick={() => handleAction(b._id, 'reject')} className="flex-1 py-2 bg-error/10 border border-error/30 text-error rounded-xl text-sm font-medium hover:bg-error hover:text-white transition-all shadow-sm">Reject</button>
                </div>
              )}
              {b.status === 'CONFIRMED' && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button onClick={() => handleAction(b._id, 'complete')} className="w-full py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-medium hover:bg-primary hover:text-white transition-all shadow-sm">Mark Complete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default BookingManagePage;
