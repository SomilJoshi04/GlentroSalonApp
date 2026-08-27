/**
 * IncomingCallScreen.jsx
 * Displayed when the current user is receiving an incoming call.
 * Plays ringtone audio and shows Accept/Reject buttons.
 */

import { useEffect, useRef } from 'react';

// Uses the existing adminRing.mp3 in the public folder for the ringtone
const RING_SOUND_PATH = '/adminRing.mp3';

const IncomingCallScreen = ({ callerName, callerAvatar, callType = 'audio', onAccept, onReject }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Play ringtone on loop
    const audio = new Audio(RING_SOUND_PATH);
    audio.loop = true;
    audio.volume = 0.8;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Autoplay blocked by browser — acceptable, user will still see the screen
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
  };

  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onReject();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between py-16 px-6">
      {/* Top label */}
      <div className="text-center">
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
          Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
        </p>
      </div>

      {/* Caller info */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Ringing animation */}
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/30 scale-110" />
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/15 scale-125" style={{ animationDelay: '0.3s' }} />
          {callerAvatar ? (
            <img
              src={callerAvatar}
              alt={callerName}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20 relative z-10"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-600 border-4 border-white/20 relative z-10 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-white/60">person</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">{callerName}</h2>
          <p className="text-slate-400 mt-1 text-sm flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Incoming call…
          </p>
        </div>
      </div>

      {/* Accept / Reject */}
      <div className="flex items-center gap-16">
        {/* Reject */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg flex items-center justify-center"
            aria-label="Reject call"
          >
            <span className="material-symbols-outlined text-white text-[28px]">call_end</span>
          </button>
          <p className="text-slate-400 text-xs">Decline</p>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg flex items-center justify-center animate-bounce"
            aria-label="Accept call"
          >
            <span className="material-symbols-outlined text-white text-[28px]">call</span>
          </button>
          <p className="text-slate-400 text-xs">Accept</p>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallScreen;
