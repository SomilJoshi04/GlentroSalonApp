/**
 * Chat Socket Handler
 * Handles real-time chat messaging and Agora-based calling signaling.
 *
 * WebRTC signaling (offer/answer/ICE) is REMOVED — Agora SDK handles media internally.
 * This socket now handles:
 *   1. Chat room events (join, leave, typing, read)
 *   2. Call signaling: notify recipient, relay accept/reject/end
 *   3. Backend booking validation before forwarding call:initiate
 */

const Booking = require('../models/Booking');
const PlatformFee = require('../models/PlatformFee');

const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    // ── Chat Room Events ────────────────────────────────────────────────────────

    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:typing', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    socket.on('chat:stop-typing', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    socket.on('chat:read', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:read', {
        chatId,
        readBy: socket.userId,
      });
    });

    // ── Agora Call Signaling ────────────────────────────────────────────────────
    // Note: Agora SDK handles the actual media (audio/video) internally.
    // Socket.io is only used here to:
    //   a) Notify the recipient that an incoming call is happening (with channel info)
    //   b) Relay accept / reject / end signals between participants

    /**
     * call:initiate
     * Emitted by caller when they want to start a call.
     * Backend validates booking + admin call policy before forwarding.
     *
     * Data: { bookingId, recipientId, recipientRole, channelName, callType }
     */
    socket.on('call:initiate', async (data) => {
      try {
        const { bookingId, recipientId, recipientRole, channelName, callType } = data;

        if (!bookingId || !recipientId || !channelName) {
          socket.emit('call:error', { message: 'Missing required call data (bookingId, recipientId, channelName)' });
          return;
        }

        // ── Security: Validate booking ────────────────────────────────────────
        const booking = await Booking.findById(bookingId)
          .populate('salon', 'vendor name')
          .populate('user', 'name')
          .lean();

        if (!booking) {
          socket.emit('call:error', { message: 'Booking not found' });
          return;
        }

        // Confirm caller is a participant of this booking
        const callerId = socket.userId?.toString();
        const callerRole = socket.userRole;
        const isUser = callerRole === 'user' && booking.user?._id?.toString() === callerId;
        const isVendor = callerRole === 'vendor' && booking.salon?.vendor?.toString() === callerId;

        if (!isUser && !isVendor) {
          socket.emit('call:error', { message: 'You are not a participant of this booking' });
          return;
        }

        // Booking must be CONFIRMED
        if (booking.status !== 'CONFIRMED') {
          socket.emit('call:error', {
            message: `Calling is not allowed. Booking is ${booking.status}.`,
            reason: 'BOOKING_NOT_CONFIRMED',
          });
          return;
        }

        // ── Security: Validate admin call policy from DB ───────────────────────
        let policy = await PlatformFee.findOne({ isActive: true }).lean();
        if (!policy) policy = { callEnabled: true, callWindowMinutes: 60 };

        if (!policy.callEnabled) {
          socket.emit('call:error', {
            message: 'In-app calling has been disabled by the administrator.',
            reason: 'CALL_DISABLED_BY_ADMIN',
          });
          return;
        }

        if (policy.callWindowMinutes > 0) {
          const bookingDate = new Date(booking.bookingDate);
          const [hours, minutes] = (booking.startTime || '00:00').split(':').map(Number);
          const appointmentAt = new Date(bookingDate);
          appointmentAt.setHours(hours, minutes, 0, 0);
          const now = new Date();

          if (appointmentAt < now) {
            socket.emit('call:error', {
              message: 'The appointment time has already passed.',
              reason: 'APPOINTMENT_PASSED',
            });
            return;
          }
        }

        // ── All checks passed — forward to recipient ───────────────────────────
        
        let callerName = 'User';
        let callerAvatar = null;
        if (socket.userRole === 'user' && booking.user) {
          callerName = booking.user.name;
        } else if (socket.userRole === 'vendor' && booking.salon) {
          callerName = booking.salon.name;
        }

        const recipientRoom = `${recipientRole}:${recipientId}`;
        console.log(`[CALL INITIATE] from ${socket.userId} (${socket.userRole}) to room ${recipientRoom}`);
        
        const CallLog = require('../models/CallLog');
        try {
          await CallLog.create({
            booking: bookingId,
            caller: socket.userId,
            callerRole: socket.userRole,
            recipient: recipientId,
            recipientRole: recipientRole,
            channelName: channelName,
            status: 'missed' // Optimistic default
          });
        } catch (dbErr) {
          console.error('Failed to save CallLog:', dbErr.message);
        }

        io.to(recipientRoom).emit('call:incoming', {
          callerId: socket.userId,
          callerRole: socket.userRole,
          callerName,
          callerAvatar,
          bookingId,
          channelName, // Agora channel — recipient joins this same channel
          callType: callType || 'audio',
        });

        // Confirm to caller that signal was sent
        socket.emit('call:initiated', { channelName, bookingId });

      } catch (err) {
        console.error('call:initiate error:', err);
        socket.emit('call:error', { message: 'Failed to initiate call. Please try again.' });
      }
    });

    /**
     * call:accept
     * Recipient accepts the call — inform the original caller.
     * Data: { callerId, callerRole, bookingId, channelName }
     */
    socket.on('call:accept', async (data) => {
      const { callerId, callerRole, bookingId, channelName } = data;
      const callerRoom = `${callerRole}:${callerId}`;
      
      const CallLog = require('../models/CallLog');
      try {
        await CallLog.findOneAndUpdate(
          { channelName },
          { status: 'active', startedAt: Date.now() }
        );
      } catch (e) {
        console.error('CallLog update error (accept):', e.message);
      }

      io.to(callerRoom).emit('call:accepted', {
        acceptedBy: socket.userId,
        bookingId,
        channelName,
      });
    });

    /**
     * call:reject
     * Recipient rejects the call — inform the original caller.
     * Data: { callerId, callerRole, bookingId }
     */
    socket.on('call:reject', async (data) => {
      const { callerId, callerRole, bookingId } = data;
      const callerRoom = `${callerRole}:${callerId}`;
      
      const CallLog = require('../models/CallLog');
      try {
        await CallLog.findOneAndUpdate(
          { booking: bookingId },
          { status: 'rejected', endedAt: Date.now() }
        ).sort({ createdAt: -1 });
      } catch (e) {
        console.error('CallLog update error (reject):', e.message);
      }

      io.to(callerRoom).emit('call:rejected', {
        rejectedBy: socket.userId,
        bookingId,
      });
    });

    /**
     * call:end
     * Either participant ends the call — inform the other side.
     * Data: { recipientId, recipientRole, bookingId }
     */
    socket.on('call:end', async (data) => {
      const { recipientId, recipientRole, bookingId } = data;
      const recipientRoom = `${recipientRole}:${recipientId}`;
      
      const CallLog = require('../models/CallLog');
      try {
        const log = await CallLog.findOne({ booking: bookingId }).sort({ createdAt: -1 });
        if (log && log.status !== 'completed' && log.status !== 'missed' && log.status !== 'rejected') {
          log.status = 'completed';
          log.endedAt = Date.now();
          if (log.startedAt) {
            log.durationSeconds = Math.floor((log.endedAt - log.startedAt) / 1000);
          }
          await log.save();
        }
      } catch (e) {
        console.error('CallLog update error (end):', e.message);
      }

      io.to(recipientRoom).emit('call:ended', {
        endedBy: socket.userId,
        bookingId,
      });
    });

    /**
     * call:busy
     * Recipient is already on a call — inform the caller.
     * Data: { callerId, callerRole }
     */
    socket.on('call:busy', async (data) => {
      const { callerId, callerRole } = data;
      const callerRoom = `${callerRole}:${callerId}`;
      
      const CallLog = require('../models/CallLog');
      try {
        await CallLog.findOneAndUpdate(
          { caller: callerId, recipient: socket.userId },
          { status: 'busy', endedAt: Date.now() }
        ).sort({ createdAt: -1 });
      } catch (e) {
        console.error('CallLog update error (busy):', e.message);
      }

      io.to(callerRoom).emit('call:busy', { busyUserId: socket.userId });
    });
  });
};

module.exports = { setupChatSocket };
