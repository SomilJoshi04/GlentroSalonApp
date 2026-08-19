import { useState, useEffect } from 'react';
import { getPackages, approvePackage, rejectPackage } from '../services/adminApi';

const PackagesPage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [rejectionReason, setRejectionReason] = useState({});

  useEffect(() => { load(); }, [filter]);
  const load = async () => { 
    setLoading(true);
    setError(null);
    try { 
      const r = await getPackages({ status: filter }); 
      const data = r.data?.data;
      const list = data?.packages || data || [];
      setPackages(Array.isArray(list) ? list : []); 
    } catch (e) {
      setError('Unable to load packages. Please try again.');
    } 
    setLoading(false); 
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') await approvePackage(id);
      else {
        const reason = rejectionReason[id] || 'Rejected by admin';
        await rejectPackage(id, { adminNote: reason });
      }
      load();
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to process action'); 
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Offers & Packages Moderation</h1>
      <div className="flex gap-2">
        {['PENDING', 'ACTIVE', 'REJECTED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-surface-card text-text-secondary border border-border'}`}>{f}</button>
        ))}
      </div>
      {error ? (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {packages.length === 0 ? <p className="text-text-muted text-center py-8">No packages found for the selected status.</p> :
            packages.map(p => (
            <div key={p._id} className="bg-surface-card rounded-2xl p-5 border border-border flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h4 className="font-semibold text-text-primary">{p.name}</h4>
                <p className="text-sm text-text-secondary mt-1">Vendor: {p.vendor?.name} • Salon: {p.salon?.name}</p>
                <div className="flex items-center gap-2 mt-2"><span className="text-sm text-text-muted line-through">₹{p.totalPrice}</span><span className="font-bold text-primary-500">₹{p.discountedPrice}</span></div>
                {p.validFrom && p.validTo && (
                  <p className="text-xs text-text-muted mt-2 border border-border inline-block px-2 py-1 rounded bg-surface-elevated">
                    Valid: {new Date(p.validFrom).toLocaleDateString()} - {new Date(p.validTo).toLocaleDateString()}
                  </p>
                )}
                {p.description && <p className="text-sm text-text-secondary mt-2">{p.description}</p>}
                {p.status === 'REJECTED' && p.adminNote && (
                  <div className="mt-3 p-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger">
                    <strong>Reason:</strong> {p.adminNote}
                  </div>
                )}
              </div>
              {filter === 'PENDING' && (
                <div className="flex flex-col gap-2 items-end shrink-0 min-w-[200px]">
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleAction(p._id, 'approve')} className="flex-1 py-2 bg-success/20 text-success rounded-xl text-sm font-medium hover:bg-success hover:text-white transition-all">Approve</button>
                    <button onClick={() => handleAction(p._id, 'reject')} className="flex-1 py-2 bg-danger/20 text-danger rounded-xl text-sm font-medium hover:bg-danger hover:text-white transition-all">Reject</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Rejection reason..." 
                    className="w-full text-xs px-2 py-1.5 rounded bg-surface-elevated border border-border text-text-primary"
                    value={rejectionReason[p._id] || ''}
                    onChange={(e) => setRejectionReason({ ...rejectionReason, [p._id]: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))
        }
      </div>
      )}
    </div>
  );
};
export default PackagesPage;
