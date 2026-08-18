import { useState, useEffect } from 'react';
import { getAllSalons, updateSalonStatus } from '../services/adminApi';

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

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">All Salons ({salons.length})</h1>
      <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="text-left px-4 py-3 text-text-muted">Name</th><th className="text-left px-4 py-3 text-text-muted">City</th><th className="text-left px-4 py-3 text-text-muted">Vendor</th><th className="text-left px-4 py-3 text-text-muted">Gender</th><th className="text-left px-4 py-3 text-text-muted">Status</th><th className="text-left px-4 py-3 text-text-muted">Rating</th><th className="text-left px-4 py-3 text-text-muted">Action</th></tr></thead>
          <tbody className="divide-y divide-border">
            {salons.map(s => (
              <tr key={s._id} className="hover:bg-surface-elevated"><td className="px-4 py-3 text-text-primary font-medium">{s.name}</td><td className="px-4 py-3 text-text-secondary">{s.city}</td><td className="px-4 py-3 text-text-secondary">{s.vendor?.name || '-'}</td><td className="px-4 py-3 capitalize text-text-secondary">{s.gender}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isApproved ? (s.isActive ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger') : 'bg-warning/20 text-warning'}`}>{s.isApproved ? (s.isActive ? 'Active' : 'Suspended') : 'Pending'}</span></td>
                <td className="px-4 py-3 text-text-secondary flex items-center">
                  <span className="material-symbols-outlined text-[16px] text-amber-500 mr-0.5">star</span>
                  {s.ratings?.average?.toFixed(1) || '0.0'}
                </td>
                <td className="px-4 py-3">
                  {!s.isApproved ? (
                    <button onClick={() => handleStatusChange(s._id, true, true)} className="px-3 py-1.5 rounded-lg bg-success text-white font-medium text-xs hover:bg-success/80">Approve</button>
                  ) : (
                    <button onClick={() => handleStatusChange(s._id, true, !s.isActive)} className={`px-3 py-1.5 rounded-lg border font-medium text-xs ${s.isActive ? 'border-danger text-danger hover:bg-danger/10' : 'border-success text-success hover:bg-success/10'}`}>
                      {s.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default SalonsPage;
