import { useState, useEffect } from 'react';
import { getCallHistory } from '../services/vendorApi';
import { format } from 'date-fns';
import { useCall } from '../../../context/CallContext';

const CallHistoryPage = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startCall } = useCall();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getCallHistory();
        setCalls(res.data.data);
      } catch (err) {
        console.error('Failed to fetch call history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'missed':
        return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Missed</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Rejected</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Completed</span>;
      case 'busy':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Busy</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full capitalize">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-on-surface mb-6">Call History</h1>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-variant rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold text-on-surface mb-2">Call History</h1>
      <p className="text-sm md:text-base text-muted-text mb-6">View your recent incoming and outgoing calls.</p>

      {calls.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border shadow-sm">
          <span className="material-symbols-outlined text-6xl text-muted-text/30 mb-4">history</span>
          <h3 className="text-lg font-bold text-on-surface">No Call History</h3>
          <p className="text-muted-text text-sm">You haven't made or received any calls yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          
          {/* Mobile View: Cards */}
          <div className="md:hidden divide-y divide-border">
            {calls.map((call) => (
              <div key={call._id} className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={call.contactAvatar || `https://ui-avatars.com/api/?name=${call.contactName}&background=random`} 
                      alt={call.contactName} 
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{call.contactName}</p>
                      <p className="text-xs text-muted-text capitalize truncate">{call.contactRole}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(call.status)}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm border-t border-border pt-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs text-muted-text">
                      <span className={`material-symbols-outlined text-[14px] ${call.isOutgoing ? 'text-blue-500' : 'text-emerald-500'}`}>
                        {call.isOutgoing ? 'call_made' : 'call_received'}
                      </span>
                      <span>{call.isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDuration(call.durationSeconds)}</span>
                    </div>
                    <div className="text-xs text-muted-text">
                      {format(new Date(call.createdAt), 'MMM dd, yyyy hh:mm a')}
                    </div>
                  </div>
                  <button
                    onClick={() => startCall(call.bookingId, 'audio')}
                    disabled={!call.bookingId}
                    className="shrink-0 flex items-center justify-center w-10 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-text uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.map((call) => (
                  <tr key={call._id} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img 
                          src={call.contactAvatar || `https://ui-avatars.com/api/?name=${call.contactName}&background=random`} 
                          alt={call.contactName} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{call.contactName}</p>
                          <p className="text-xs text-muted-text capitalize">{call.contactRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`material-symbols-outlined text-[18px] ${call.isOutgoing ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {call.isOutgoing ? 'call_made' : 'call_received'}
                        </span>
                        <span className="text-on-surface font-medium">{call.isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-on-surface font-medium">{format(new Date(call.createdAt), 'MMM dd, yyyy')}</p>
                      <p className="text-xs text-muted-text">{format(new Date(call.createdAt), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(call.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-text font-medium">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => startCall(call.bookingId, 'audio')}
                        disabled={!call.bookingId}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        Call Back
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallHistoryPage;
