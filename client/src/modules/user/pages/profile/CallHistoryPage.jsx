import { useState, useEffect } from 'react';
import { getCallHistory } from '../../services/userApi';
import { format } from 'date-fns';
import { useCall } from '../../../../context/CallContext';
import { useNavigate } from 'react-router-dom';

const UserCallHistoryPage = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startCall } = useCall();
  const navigate = useNavigate();

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
        return <span className="px-2.5 py-1 bg-error/10 text-error text-[10px] font-bold rounded-full uppercase">Missed</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase">Rejected</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase">Completed</span>;
      case 'busy':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Busy</span>;
      default:
        return <span className="px-2.5 py-1 bg-surface-variant text-muted-text text-[10px] font-bold rounded-full uppercase">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:max-w-5xl lg:mx-auto mt-16 md:mt-0">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">Call History</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-variant rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:max-w-5xl lg:mx-auto mt-16 md:mt-0 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors flex items-center justify-center text-on-surface">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-[24px] font-bold text-on-surface tracking-tight">Call History</h1>
      </div>

      {calls.length === 0 ? (
        <div className="bg-surface rounded-[32px] p-12 text-center border border-border shadow-sm flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">history</span>
          </div>
          <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">No Call History</h3>
          <p className="font-body-sm text-muted-text max-w-sm">You haven't made or received any calls yet. Book a salon to start a call.</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-full font-bold hover:shadow-md transition-shadow"
          >
            Explore Salons
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {calls.map((call) => (
            <div key={call._id} className="bg-surface rounded-2xl p-4 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={call.contactAvatar || `https://ui-avatars.com/api/?name=${call.contactName}&background=random`} 
                    alt={call.contactName} 
                    className="w-14 h-14 rounded-full object-cover border border-border shadow-sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-surface flex items-center justify-center ${call.isOutgoing ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {call.isOutgoing ? 'call_made' : 'call_received'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-on-surface leading-tight mb-1">{call.contactName}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(call.status)}
                    <span className="text-[12px] text-muted-text">• {format(new Date(call.createdAt), 'MMM dd, hh:mm a')}</span>
                    {call.durationSeconds > 0 && (
                      <span className="text-[12px] text-muted-text font-medium bg-surface-variant px-2 py-0.5 rounded-md">
                        {formatDuration(call.durationSeconds)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => startCall(call.bookingId, 'audio')}
                  disabled={!call.bookingId}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call Back
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserCallHistoryPage;
