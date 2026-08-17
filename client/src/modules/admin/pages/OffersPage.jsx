import { useState, useEffect } from 'react';
import { getOffers, approveOffer, rejectOffer } from '../services/adminApi';

const OffersPage = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => { load(); }, [filter]);
  const load = async () => { 
    setLoading(true);
    setError(null);
    try { 
      const r = await getOffers({ status: filter }); 
      const data = r.data?.data;
      const list = data?.offers || data || [];
      setOffers(Array.isArray(list) ? list : []); 
    } catch (e) {
      setError('Unable to load offers. Please try again.');
    } 
    setLoading(false); 
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'approve') await approveOffer(id);
      else await rejectOffer(id, { reason: 'Rejected by admin' });
      load();
    } catch (e) { 
      alert(e.response?.data?.message || 'Failed to process action'); 
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Offers Moderation</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.length === 0 ? <p className="text-text-muted col-span-2 text-center py-8">No offers found for the selected status.</p> :
            offers.map(o => (
            <div key={o._id} className="bg-gradient-to-br from-surface-card to-surface-elevated rounded-2xl p-5 border border-border">
              <h4 className="font-semibold text-text-primary text-lg">{o.title}</h4>
              <p className="text-sm text-text-secondary mt-1">Vendor: {o.vendor?.name}</p>
              <p className="mt-3 text-2xl font-bold text-primary-400">{o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}</p>
              <p className="text-sm text-text-muted mt-2">{o.description}</p>
              {filter === 'PENDING' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button onClick={() => handleAction(o._id, 'approve')} className="flex-1 py-2 bg-success/20 text-success rounded-xl text-sm font-medium hover:bg-success hover:text-white transition-all">Approve</button>
                  <button onClick={() => handleAction(o._id, 'reject')} className="flex-1 py-2 bg-danger/20 text-danger rounded-xl text-sm font-medium hover:bg-danger hover:text-white transition-all">Reject</button>
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
export default OffersPage;
