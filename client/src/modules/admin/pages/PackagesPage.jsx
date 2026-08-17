import { useState, useEffect } from 'react';
import { getPackages, approvePackage, rejectPackage } from '../services/adminApi';

const PackagesPage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => { load(); }, [filter]);
  const load = async () => { try { const r = await getPackages({ status: filter }); setPackages(r.data.data.packages || r.data.data); } catch (e) {} setLoading(false); };

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') await approvePackage(id);
      else await rejectPackage(id, { reason: 'Rejected by admin' });
      load();
    } catch (e) { alert('Failed'); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Packages Moderation</h1>
      <div className="flex gap-2">
        {['PENDING', 'ACTIVE', 'REJECTED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-surface-card text-text-secondary border border-border'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-4">
        {packages.length === 0 ? <p className="text-text-muted text-center py-8">No packages found</p> :
          packages.map(p => (
            <div key={p._id} className="bg-surface-card rounded-2xl p-5 border border-border flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h4 className="font-semibold text-text-primary">{p.name}</h4>
                <p className="text-sm text-text-secondary mt-1">Vendor: {p.vendor?.name} • Salon: {p.salon?.name}</p>
                <div className="flex items-center gap-2 mt-2"><span className="text-sm text-text-muted line-through">₹{p.totalPrice}</span><span className="font-bold text-primary-500">₹{p.discountedPrice}</span></div>
                <p className="text-sm text-text-secondary mt-2">{p.description}</p>
              </div>
              {filter === 'PENDING' && (
                <div className="flex gap-2 items-start shrink-0">
                  <button onClick={() => handleAction(p._id, 'approve')} className="px-4 py-2 bg-success/20 text-success rounded-xl text-sm font-medium hover:bg-success hover:text-white transition-all">Approve</button>
                  <button onClick={() => handleAction(p._id, 'reject')} className="px-4 py-2 bg-danger/20 text-danger rounded-xl text-sm font-medium hover:bg-danger hover:text-white transition-all">Reject</button>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
};
export default PackagesPage;
