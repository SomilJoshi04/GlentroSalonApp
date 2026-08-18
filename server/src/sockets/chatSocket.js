/**
 * Chat Socket Handler
 * Handles real-time chat messaging and WebRTC calling signaling
 */
const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    // Join a specific chat room
    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${socket.userId} joined chat:${chatId}`);
    });

    // Leave chat room
    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    // Send message (deprecated, now handled by REST API which emits to sockets directly)
    // socket.on('chat:message', ...) is no longer needed

    // Typing indicator
    socket.on('chat:typing', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: true,
      });
    });

    // Stop typing
    socket.on('chat:stop-typing', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:typing', {
        userId: socket.userId,
        isTyping: false,
      });
    });

    // Mark messages as read
    socket.on('chat:read', (data) => {
      const { chatId } = data;
      socket.to(`chat:${chatId}`).emit('chat:read', {
        chatId,
        readBy: socket.userId,
      });
    });

    // ===== WebRTC Calling Signaling =====

    // Initiate a call
    socket.on('call:initiate', (data) => {
      const { recipientId, recipientRole, offer, callType } = data;
      const recipientRoom = `${recipientRole}:${recipientId}`;
      io.to(recipientRoom).emit('call:incoming', {
        callerId: socket.userId,
        callerRole: socket.userRole,
        offer,
        callType: callType || 'audio', // audio or video
      });
    });

    // Answer a call
    socket.on('call:answer', (data) => {
      const { callerId, callerRole, answer } = data;
      const callerRoom = `${callerRole}:${callerId}`;
      io.to(callerRoom).emit('call:answered', {
        answer,
        answererId: socket.userId,
      });
    });

    // Exchange ICE candidates
    socket.on('call:ice-candidate', (data) => {
      const { recipientId, recipientRole, candidate } = data;
      const recipientRoom = `${recipientRole}:${recipientId}`;
      io.to(recipientRoom).emit('call:ice-candidate', {
        candidate,
        senderId: socket.userId,
      });
    });

    // Reject a call
    socket.on('call:reject', (data) => {
      const { callerId, callerRole } = data;
      const callerRoom = `${callerRole}:${callerId}`;
      io.to(callerRoom).emit('call:rejected', {
        rejectedBy: socket.userId,
      });
    });

    // End a call
    socket.on('call:end', (data) => {
      const { recipientId, recipientRole } = data;
      const recipientRoom = `${recipientRole}:${recipientId}`;
      io.to(recipientRoom).emit('call:ended', {
        endedBy: socket.userId,
      });
    });
  });
};

module.exports = { setupChatSocket };
