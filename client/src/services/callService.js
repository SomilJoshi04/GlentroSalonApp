/**
 * callService.js
 *
 * Agora RTC SDK wrapper for in-app audio calling.
 * App ID comes from the backend token API response — NEVER hardcoded here.
 * Agora SDK is loaded lazily (dynamic import) to keep initial bundle small.
 */
import api from './api/axiosInstance'; // existing axios instance with auth interceptors

let client = null;
let localAudioTrack = null;
let isJoined = false;

/**
 * Fetch Agora token from backend (performs all security checks server-side).
 * @param {string} bookingId
 * @returns {{ token, channelName, uid, appId, callWindowEndsAt }}
 */
export const fetchCallToken = async (bookingId) => {
  const res = await api.get(`/call/token?bookingId=${bookingId}`);
  return res.data.data;
};

/**
 * Check if call is available for a booking (lightweight — no token generated).
 * @param {string} bookingId
 * @returns {{ canCall, reason, callWindowEndsAt, minutesUntilCutoff }}
 */
export const checkCallAvailability = async (bookingId) => {
  try {
    const res = await api.get(`/call/availability?bookingId=${bookingId}`);
    return res.data.data;
  } catch {
    return { canCall: false, reason: 'ERROR' };
  }
};

/**
 * Initialize and join an Agora channel.
 * @param {string} appId - From backend token response
 * @param {string} token - RTC token from backend
 * @param {string} channelName - Channel to join
 * @param {number} uid - Numeric UID from backend
 */
export const joinChannel = async (appId, token, channelName, uid) => {
  if (isJoined) return;

  // Lazy load Agora SDK (code-split — not in initial bundle)
  const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;

  client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Subscribe to remote users BEFORE joining so we don't miss already-published tracks
  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
  });

  await client.join(appId, channelName, token, uid);
  isJoined = true;

  // Create and publish local audio track (microphone)
  localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: 'music_standard', // good quality voice
    AEC: true,  // Acoustic Echo Cancellation
    ANS: true,  // Ambient Noise Suppression
    AGC: true,  // Automatic Gain Control
  });
  await client.publish([localAudioTrack]);

  return client;
};

/**
 * Subscribe to a remote user's audio (plays in speaker automatically).
 * Call this in 'user-published' event handler.
 */
export const subscribeRemoteAudio = async (user, mediaType) => {
  if (!client) return;
  await client.subscribe(user, mediaType);
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
};

/**
 * Leave the Agora channel and release resources.
 */
export const leaveChannel = async () => {
  if (!isJoined || !client) return;

  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack.close();
    localAudioTrack = null;
  }

  await client.leave();
  client = null;
  isJoined = false;
};

/**
 * Mute/unmute local microphone.
 * @returns {boolean} new muted state
 */
export const toggleMute = async () => {
  if (!localAudioTrack) return true;
  const muted = !localAudioTrack.muted;
  await localAudioTrack.setMuted(muted);
  return muted;
};

/**
 * Register Agora client event listeners.
 * Must be called after joinChannel().
 * @param {string} event - Agora event name
 * @param {Function} handler
 */
export const on = (event, handler) => {
  if (client) client.on(event, handler);
};

export const off = (event, handler) => {
  if (client) client.off(event, handler);
};

export const getClient = () => client;
export const isInCall = () => isJoined;

const callService = {
  fetchCallToken,
  checkCallAvailability,
  joinChannel,
  subscribeRemoteAudio,
  leaveChannel,
  toggleMute,
  on,
  off,
  getClient,
  isInCall,
};

export default callService;
