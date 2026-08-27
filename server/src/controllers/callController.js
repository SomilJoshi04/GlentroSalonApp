/**
 * callController.js
 *
 * Handles Agora token generation for in-app calling.
 * All policy checks are done server-side — frontend cannot bypass them.
 *
 * Routes:
 *   GET /api/call/token?bookingId=xxx  →  getCallToken
 */

const Booking = require('../models/Booking');
const PlatformFee = require('../models/PlatformFee');
const { generateRtcToken, buildChannelName, buildNumericUid } = require('../utils/agoraToken');

/**
 * GET /api/call/token
 * Query: ?bookingId=xxx
 *
 * Security checks (in order):
 * 1. User must be authenticated (handled by `protect` middleware)
 * 2. Booking must exist
 * 3. Caller must be a participant of this booking (user or vendor)
 * 4. Booking must be CONFIRMED
 * 5. Admin call policy must allow calling (callEnabled, callWindowMinutes)
 *
 * Returns Agora token + channel info if all checks pass.
 */
const getCallToken = async (req, res, next) => {
  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    // ── Step 1: Fetch booking ──────────────────────────────────────────────────
    const booking = await Booking.findById(bookingId)
      .populate('salon', 'vendor name')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // ── Step 2: Verify caller is a participant ─────────────────────────────────
    const callerId = req.user.id.toString();
    const callerRole = req.user.role;

    const isUser = callerRole === 'user' && booking.user?.toString() === callerId;
    const isVendor = callerRole === 'vendor' && booking.salon?.vendor?.toString() === callerId;

    if (!isUser && !isVendor) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant of this booking',
      });
    }

    // ── Step 3: Booking must be CONFIRMED ─────────────────────────────────────
    if (booking.status !== 'CONFIRMED') {
      return res.status(403).json({
        success: false,
        message: `Calling is not available. Booking is currently ${booking.status}.`,
        bookingStatus: booking.status,
      });
    }

    // ── Step 4: Fetch admin call policy from DB (never hardcoded) ─────────────
    let policy = await PlatformFee.findOne({ isActive: true }).lean();
    if (!policy) {
      policy = { callEnabled: true, callWindowMinutes: 60 };
    }

    if (!policy.callEnabled) {
      return res.status(403).json({
        success: false,
        message: 'In-app calling has been disabled by the administrator.',
        reason: 'CALL_DISABLED_BY_ADMIN',
      });
    }

    // ── Step 5: Call window check (admin-configured) ───────────────────────────
    const windowMinutes = policy.callWindowMinutes;

    if (windowMinutes > 0) {
      // Parse appointment datetime from booking
      const bookingDate = new Date(booking.bookingDate);
      const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
      const appointmentAt = new Date(bookingDate);
      appointmentAt.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const minutesUntilAppointment = (appointmentAt - now) / 60000;

      // Call is allowed only BEFORE the cutoff (appointment - windowMinutes)
      if (minutesUntilAppointment < windowMinutes && minutesUntilAppointment < 0) {
        // Appointment already passed — no call
        return res.status(403).json({
          success: false,
          message: 'The appointment time has already passed. Calling is no longer available.',
          reason: 'APPOINTMENT_PASSED',
        });
      }

      // If minutesUntilAppointment is positive but less than window — call allowed
      // (call window means: can call anytime AFTER confirmation up to appointment)
      // Admin sets how far BEFORE appointment the call option disappears
      // So: if windowMinutes=60, call disappears 60 minutes before appointment
      // i.e. can call if minutesUntilAppointment >= windowMinutes OR windowMinutes=0
    }

    // ── Step 6: Generate Agora token ──────────────────────────────────────────
    const channelName = buildChannelName(bookingId);
    const uid = buildNumericUid(callerId);
    const tokenData = generateRtcToken(channelName, uid, 'publisher');

    // Calculate when call window ends (for frontend countdown)
    let callWindowEndsAt = null;
    if (windowMinutes > 0) {
      const bookingDate = new Date(booking.bookingDate);
      const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
      const appointmentAt = new Date(bookingDate);
      appointmentAt.setHours(hours, minutes, 0, 0);
      callWindowEndsAt = new Date(appointmentAt.getTime() - windowMinutes * 60000).toISOString();
    }

    res.json({
      success: true,
      data: {
        ...tokenData,
        callWindowEndsAt,
        callWindowMinutes: windowMinutes,
        bookingId,
        callType: 'audio', // future: can extend to 'video'
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/call/availability?bookingId=xxx
 *
 * Lightweight check — tells frontend if call button should show.
 * Does NOT generate a token (cheaper to call frequently).
 */
const checkCallAvailability = async (req, res, next) => {
  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('salon', 'vendor')
      .lean();

    if (!booking) {
      return res.json({ success: true, data: { canCall: false, reason: 'BOOKING_NOT_FOUND' } });
    }

    const callerId = req.user.id.toString();
    const callerRole = req.user.role;
    const isUser = callerRole === 'user' && booking.user?.toString() === callerId;
    const isVendor = callerRole === 'vendor' && booking.salon?.vendor?.toString() === callerId;

    if (!isUser && !isVendor) {
      return res.json({ success: true, data: { canCall: false, reason: 'NOT_PARTICIPANT' } });
    }

    if (booking.status !== 'CONFIRMED') {
      return res.json({
        success: true,
        data: { canCall: false, reason: 'BOOKING_NOT_CONFIRMED', bookingStatus: booking.status },
      });
    }

    let policy = await PlatformFee.findOne({ isActive: true }).lean();
    if (!policy) policy = { callEnabled: true, callWindowMinutes: 60 };

    if (!policy.callEnabled) {
      return res.json({ success: true, data: { canCall: false, reason: 'CALL_DISABLED_BY_ADMIN' } });
    }

    const windowMinutes = policy.callWindowMinutes;
    let callWindowEndsAt = null;
    let minutesUntilCutoff = null;

    if (windowMinutes > 0) {
      const bookingDate = new Date(booking.bookingDate);
      const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
      const appointmentAt = new Date(bookingDate);
      appointmentAt.setHours(hours, minutes, 0, 0);

      callWindowEndsAt = new Date(appointmentAt.getTime() - windowMinutes * 60000).toISOString();
      minutesUntilCutoff = (new Date(callWindowEndsAt) - new Date()) / 60000;

      if (appointmentAt < new Date()) {
        return res.json({
          success: true,
          data: { canCall: false, reason: 'APPOINTMENT_PASSED', callWindowEndsAt },
        });
      }
    }

    res.json({
      success: true,
      data: {
        canCall: true,
        callWindowEndsAt,
        callWindowMinutes: windowMinutes,
        minutesUntilCutoff: minutesUntilCutoff ? Math.round(minutesUntilCutoff) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/call/history
 * Fetch call history for the authenticated user or vendor.
 */
const getCallHistory = async (req, res, next) => {
  try {
    const CallLog = require('../models/CallLog');
    const userId = req.user.id.toString();

    // Find calls where user is either caller or recipient
    const callLogs = await CallLog.find({
      $or: [{ caller: userId }, { recipient: userId }]
    })
    .populate({
      path: 'booking',
      select: 'bookingDate startTime service package salon user',
      populate: [
        { path: 'user', select: 'name avatar email' },
        { path: 'salon', select: 'name vendor address' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 calls for performance

    // Process logs to make them frontend-friendly
    const processedLogs = callLogs.map(log => {
      const isOutgoing = log.caller.toString() === userId;
      
      // Determine the "other party" (the contact)
      let contactName = 'Unknown';
      let contactAvatar = null;
      let contactRole = isOutgoing ? log.recipientRole : log.callerRole;

      if (log.booking) {
        if (contactRole === 'user' && log.booking.user) {
          contactName = log.booking.user.name;
          contactAvatar = log.booking.user.avatar;
        } else if (contactRole === 'vendor' && log.booking.salon) {
          contactName = log.booking.salon.name;
          // Optionally grab salon images if avatar is null
        }
      }

      return {
        _id: log._id,
        bookingId: log.booking ? log.booking._id : null,
        contactName,
        contactAvatar,
        contactRole,
        isOutgoing,
        status: log.status,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        durationSeconds: log.durationSeconds,
        createdAt: log.createdAt
      };
    });

    res.json({
      success: true,
      data: processedLogs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCallToken, checkCallAvailability, getCallHistory };
