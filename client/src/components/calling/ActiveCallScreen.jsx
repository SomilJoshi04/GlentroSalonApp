/**
 * ActiveCallScreen.jsx
 * Displayed when a call is live — shows timer, mute, and end call controls.
 */

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const ActiveCallScreen = ({ participantName, participantAvatar, duration, isMuted, onMute, onEnd }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-between py-16 px-6">
      {/* Status */}
      <div className="text-center">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-sm font-medium">Connected</p>
        </div>
      </div>

      {/* Avatar + name + timer */}
      <div className="flex flex-col items-center gap-6">
        {participantAvatar ? (
          <img
            src={participantAvatar}
            alt={participantName}
            className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-slate-600 border-4 border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-white/60">person</span>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">{participantName}</h2>
          <p className="text-emerald-400 mt-2 text-xl font-mono font-semibold">
            {formatDuration(duration)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-12">
        {/* Mute */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onMute}
            className={`w-14 h-14 rounded-full transition-all active:scale-95 flex items-center justify-center shadow-md ${
              isMuted
                ? 'bg-red-500/20 border-2 border-red-400 text-red-400'
                : 'bg-white/10 border-2 border-white/20 text-white'
            }`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMuted ? 'mic_off' : 'mic'}
            </span>
          </button>
          <p className="text-slate-400 text-xs">{isMuted ? 'Unmute' : 'Mute'}</p>
        </div>

        {/* End call */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg flex items-center justify-center"
            aria-label="End call"
          >
            <span className="material-symbols-outlined text-white text-[28px]">call_end</span>
          </button>
          <p className="text-slate-400 text-xs">End</p>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallScreen;
