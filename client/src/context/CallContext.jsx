/**
 * useCall.js
 *
 * React hook that manages the full call lifecycle using Agora SDK + Socket.io.
 *
 * States:
 *   'idle'      → No call activity
 *   'outgoing'  → User initiated call, waiting for other party to accept
 *   'incoming'  → Another party is calling this user
 *   'active'    → Call is live
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import callService from '../services/callService';
import { useSocket } from './SocketContext';

// Import Call Screens
import OutgoingCallScreen from '../components/calling/OutgoingCallScreen';
import IncomingCallScreen from '../components/calling/IncomingCallScreen';
import ActiveCallScreen from '../components/calling/ActiveCallScreen';

const CALL_TIMEOUT_MS = 45000; // 45 seconds — auto-reject if no answer

const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const [callState, setCallState] = useState('idle'); // idle | outgoing | incoming | active
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeCallData, setActiveCallData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState(null);

  const { socket } = useSocket();
  const callTimeoutRef = useRef(null);
  const durationTimerRef = useRef(null);

  // ── Clean up all timers ────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    callTimeoutRef.current = null;
    durationTimerRef.current = null;
  }, []);

  // ── Start call duration timer ──────────────────────────────────────────────
  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // ── Reset to idle state ────────────────────────────────────────────────────
  const resetState = useCallback(async () => {
    clearTimers();
    await callService.leaveChannel();
    setCallState('idle');
    setIncomingCallData(null);
    setActiveCallData(null);
    setIsMuted(false);
    setCallDuration(0);
    setCallError(null);
  }, [clearTimers]);

  // ── INITIATE a call (caller side) ─────────────────────────────────────────
  const startCall = useCallback(async (bookingId, recipientId, recipientRole, calleeName, calleeAvatar) => {
    console.log('startCall called with:', { bookingId, recipientId, recipientRole });
    if (callState !== 'idle') return;
    setCallError(null);

    try {
      // 1. Get token from backend (validates booking + admin policy)
      const tokenData = await callService.fetchCallToken(bookingId);

      // 2. Join Agora channel
      await callService.joinChannel(
        tokenData.appId,
        tokenData.token,
        tokenData.channelName,
        tokenData.uid
      );

      // 3. Notify recipient via socket (socket validates on backend too)
      if (socket) {
        socket.emit('call:initiate', {
          bookingId,
          recipientId,
          recipientRole,
          channelName: tokenData.channelName,
          callType: 'audio',
          callerName: calleeName, // Send the current user's name as callerName? Wait. The backend emits callerId and callerRole. The recipient doesn't know callerName.
        });
      }

      setActiveCallData({ ...tokenData, recipientId, recipientRole, bookingId, calleeName, calleeAvatar });
      setCallState('outgoing');

      // Auto-reject if no answer in 45 seconds
      callTimeoutRef.current = setTimeout(async () => {
        if (socket) {
          socket.emit('call:end', {
            recipientId,
            recipientRole,
            bookingId,
          });
        }
        await resetState();
        setCallError('No answer. Call ended.');
      }, CALL_TIMEOUT_MS);

    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to start call';
      setCallError(msg);
      await resetState();
    }
  }, [callState, socket, resetState]);

  // ── ACCEPT an incoming call (receiver side) ─────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCallData || callState !== 'incoming') return;

    try {
      const { callerId, callerRole, bookingId, channelName } = incomingCallData;

      // Fetch our own token (same channel, different UID)
      const tokenData = await callService.fetchCallToken(bookingId);

      // Join same channel
      await callService.joinChannel(
        tokenData.appId,
        tokenData.token,
        channelName, // use channel from incoming event, not new one
        tokenData.uid
      );

      // Notify caller
      if (socket) {
        socket.emit('call:accept', {
          callerId,
          callerRole,
          bookingId,
          channelName,
        });
      }

      clearTimers();
      setActiveCallData({ channelName, callerId, callerRole, bookingId });
      setCallState('active');
      startDurationTimer();

    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to accept call';
      setCallError(msg);
      await resetState();
    }
  }, [incomingCallData, callState, socket, clearTimers, startDurationTimer, resetState]);

  // ── REJECT an incoming call ───────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!incomingCallData) return;
    const { callerId, callerRole, bookingId } = incomingCallData;
    if (socket) {
      socket.emit('call:reject', { callerId, callerRole, bookingId });
    }
    clearTimers();
    resetState();
  }, [incomingCallData, socket, clearTimers, resetState]);

  // ── END an active / outgoing call ─────────────────────────────────────────
  const endCall = useCallback(async () => {
    const data = activeCallData;
    if (data && socket) {
      const recipientId = data.recipientId || data.callerId;
      const recipientRole = data.recipientRole || data.callerRole;
      socket.emit('call:end', {
        recipientId,
        recipientRole,
        bookingId: data.bookingId,
      });
    }
    await resetState();
  }, [activeCallData, socket, resetState]);

  // ── MUTE toggle ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const newMuted = await callService.toggleMute();
    setIsMuted(newMuted);
  }, []);

  // Keep a ref of callState to use inside socket listeners without adding it as a dependency
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data) => {
      console.log('Incoming call received:', data);
      if (callStateRef.current !== 'idle') {
        // Already in a call — send busy
        socket.emit('call:busy', { callerId: data.callerId, callerRole: data.callerRole });
        return;
      }
      setIncomingCallData(data);
      setCallState('incoming');

      // Auto-reject after 45s if not answered
      callTimeoutRef.current = setTimeout(() => {
        socket.emit('call:reject', {
          callerId: data.callerId,
          callerRole: data.callerRole,
          bookingId: data.bookingId,
        });
        resetState();
      }, CALL_TIMEOUT_MS);
    };

    const onAccepted = () => {
      clearTimers();
      setCallState('active');
      startDurationTimer();
    };

    const onRejected = async () => {
      clearTimers();
      await resetState();
      setCallError('Call was declined.');
    };

    const onEnded = async () => {
      clearTimers();
      await resetState();
    };

    const onBusy = async () => {
      clearTimers();
      await resetState();
      setCallError('The other party is currently on another call.');
    };

    const onError = async (data) => {
      console.log('Call error from socket:', data);
      clearTimers();
      await resetState();
      setCallError(data?.message || 'Call failed. Please try again.');
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:busy', onBusy);
    socket.on('call:error', onError);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:busy', onBusy);
      socket.off('call:error', onError);
    };
  }, [socket, clearTimers, resetState, startDurationTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      callService.leaveChannel();
    };
  }, [clearTimers]);

  const value = {
    callState,
    incomingCallData,
    activeCallData,
    isMuted,
    callDuration,
    callError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    clearError: () => setCallError(null),
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      
      {/* "" Calling Overlays (Rendered Globally) """"""""""""""""""""""""""""""""""""""""""""""""""" */}
      {callState === 'outgoing' && activeCallData && (
        <OutgoingCallScreen
          calleeName={activeCallData.calleeName || 'User'}
          calleeAvatar={activeCallData.calleeAvatar}
          onCancel={endCall}
        />
      )}
      
      {callState === 'incoming' && incomingCallData && (
        <IncomingCallScreen
          callerName={incomingCallData.callerName || 'User'}
          callerAvatar={incomingCallData.callerAvatar}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      
      {callState === 'active' && activeCallData && (
        <ActiveCallScreen
          peerName={activeCallData.calleeName || activeCallData.callerName || 'Connected'}
          peerAvatar={activeCallData.calleeAvatar || activeCallData.callerAvatar}
          callDuration={callDuration}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEnd={endCall}
        />
      )}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);

