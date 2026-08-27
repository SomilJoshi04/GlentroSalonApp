/**
 * OutgoingCallScreen.jsx
 * Displayed when the current user has initiated a call and is waiting for the other party.
 */

import { useEffect, useState } from 'react';

const OutgoingCallScreen = ({ calleeName, calleeAvatar, onCancel }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between py-16 px-6">
      {/* Top label */}
      <div className="text-center">
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Calling</p>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20 scale-110" />
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/10 scale-125 animation-delay-300" />
          {calleeAvatar ? (
            <img
              src={calleeAvatar}
              alt={calleeName}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20 relative z-10"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-600 border-4 border-white/20 relative z-10 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-white/60">person</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">{calleeName}</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Calling{dots}
          </p>
        </div>
      </div>

      {/* End call button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg flex items-center justify-center"
          aria-label="Cancel call"
        >
          <span className="material-symbols-outlined text-white text-[28px]">call_end</span>
        </button>
        <p className="text-slate-500 text-xs">Cancel</p>
      </div>
    </div>
  );
};

export default OutgoingCallScreen;
