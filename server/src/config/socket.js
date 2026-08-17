const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, USER_APP_URL, VENDOR_APP_URL, ADMIN_PANEL_URL } = require('./env');

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [USER_APP_URL, VENDOR_APP_URL, ADMIN_PANEL_URL],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.userId} (${socket.userRole})`);

    // Join personal room based on role
    const roomPrefix = socket.userRole;
    socket.join(`${roomPrefix}:${socket.userId}`);

    // Admin joins admin room
    if (socket.userRole === 'admin') {
      socket.join('admin');
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
