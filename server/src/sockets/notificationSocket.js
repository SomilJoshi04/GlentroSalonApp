/**
 * Notification Socket Handler
 * Handles real-time notification delivery
 */
const setupNotificationSocket = (io) => {
  io.on('connection', (socket) => {
    // User marks notification as read
    socket.on('notification:read', (notificationId) => {
      // Handled via REST API, this is just for real-time UI updates
      console.log(`Notification ${notificationId} read by ${socket.userId}`);
    });
  });
};

/**
 * Emit notification to a specific user/vendor/admin
 * @param {Object} io - Socket.IO instance
 * @param {string} recipientId - Recipient user/vendor ID
 * @param {string} recipientRole - 'user', 'vendor', or 'admin'
 * @param {Object} notification - Notification data
 */
const emitNotification = (io, recipientId, recipientRole, notification) => {
  const room = recipientRole === 'admin' ? 'admin' : `${recipientRole}:${recipientId}`;
  io.to(room).emit('notification:new', notification);
};

module.exports = { setupNotificationSocket, emitNotification };
