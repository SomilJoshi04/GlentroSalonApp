/**
 * agoraToken.js
 *
 * Server-side only Agora RTC token generator.
 * NEVER import this file in frontend code.
 * App ID and Certificate are read from environment variables only.
 */

const { RtcTokenBuilder, RtcRole } = require('agora-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Token expires in 1 hour (3600 seconds)
const TOKEN_EXPIRY_SECONDS = 3600;

/**
 * Generate a secure Agora RTC token for a call channel.
 *
 * @param {string} channelName - Unique channel name for this call session
 * @param {number} uid         - Numeric user ID for this participant
 * @param {string} role        - 'publisher' (can send audio/video) or 'subscriber'
 * @returns {{ token, channelName, uid, appId, expiresAt }}
 */
const generateRtcToken = (channelName, uid, role = 'publisher') => {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Agora credentials not configured in environment variables.');
  }

  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const now = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = now + TOKEN_EXPIRY_SECONDS;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpireTime,
    privilegeExpireTime
  );

  return {
    token,
    channelName,
    uid,
    appId: APP_ID, // Safe to send — this is a public identifier, NOT the certificate
    expiresAt: new Date((now + TOKEN_EXPIRY_SECONDS) * 1000).toISOString(),
  };
};

/**
 * Build a deterministic channel name from a bookingId.
 * Both caller and receiver use the same channel name to join the same call.
 */
const buildChannelName = (bookingId) => {
  return `booking_${bookingId.toString().slice(-12)}`;
};

/**
 * Build a numeric UID from a userId string (Agora requires numeric UIDs).
 * Uses last 8 hex chars of ObjectId converted to decimal, capped to safe int.
 */
const buildNumericUid = (userId) => {
  const hex = userId.toString().slice(-8);
  return parseInt(hex, 16) % 1000000000; // Keep within 32-bit safe range
};

module.exports = { generateRtcToken, buildChannelName, buildNumericUid };
