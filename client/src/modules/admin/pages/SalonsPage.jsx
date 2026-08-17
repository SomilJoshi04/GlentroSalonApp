import { useState, useEffect } from 'react';
import { getAllSalons } from '../services/adminApi';

const SalonsPage = () => {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { const r = await getAllSalons(); setSalons(r.data.data.salons || r.data.data); } catch (e) {} setLoading(false); })(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-dark-700 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">All Salons ({salons.length})</h1>
      <div className="bg-surface-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="text-left px-4 py-3 text-text-muted">Name</th><th className="text-left px-4 py-3 text-text-muted">City</th><th className="text-left px-4 py-3 text-text-muted">Vendor</th><th className="text-left px-4 py-3 text-text-muted">Gender</th><th className="text-left px-4 py-3 text-text-muted">Status</th><th className="text-left px-4 py-3 text-text-muted">Rating</th></tr></thead>
          <tbody className="divide-y divide-border">
            {salons.map(s => (
              <tr key={s._id} className="hover:bg-surface-elevated"><td className="px-4 py-3 text-text-primary font-medium">{s.name}</td><td className="px-4 py-3 text-text-secondary">{s.city}</td><td className="px-4 py-3 text-text-secondary">{s.vendor?.name || '-'}</td><td className="px-4 py-3 capitalize text-text-secondary">{s.gender}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.isApproved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{s.isApproved ? 'Approved' : 'Pending'}</span></td>
                <td className="px-4 py-3 text-text-secondary">⭐ {s.ratings?.average?.toFixed(1) || '0.0'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default SalonsPage;
