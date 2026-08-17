/**
 * Booking Socket Handler
 * Handles real-time booking status updates
 */
const setupBookingSocket = (io) => {
  io.on('connection', (socket) => {
    // Join salon room for vendors to receive booking updates
    socket.on('booking:join-salon', (salonId) => {
      socket.join(`salon:${salonId}`);
      console.log(`User ${socket.userId} joined salon:${salonId} for booking updates`);
    });

    socket.on('booking:leave-salon', (salonId) => {
      socket.leave(`salon:${salonId}`);
    });
  });
};

/**
 * Emit booking update to relevant parties
 */
const emitBookingUpdate = (io, { userId, salonId, booking, eventType }) => {
  // Notify the user
  io.to(`user:${userId}`).emit('booking:update', {
    eventType,
    booking,
  });

  // Notify the salon/vendor
  io.to(`salon:${salonId}`).emit('booking:update', {
    eventType,
    booking,
  });
};

/**
 * Emit new booking to vendor
 */
const emitNewBooking = (io, { vendorId, salonId, booking }) => {
  io.to(`vendor:${vendorId}`).emit('booking:new', { booking });
  io.to(`salon:${salonId}`).emit('booking:new', { booking });
};

module.exports = { setupBookingSocket, emitBookingUpdate, emitNewBooking };
