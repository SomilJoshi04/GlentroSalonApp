const http = require('http');
const dotenv = require('dotenv');
// Trigger nodemon restart
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./config/socket');
const { PORT, NODE_ENV } = require('./config/env');

// Import socket handlers
const { setupChatSocket } = require('./sockets/chatSocket');
const { setupNotificationSocket } = require('./sockets/notificationSocket');
const { setupBookingSocket } = require('./sockets/bookingSocket');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = initializeSocket(server);

  // Setup socket event handlers
  setupChatSocket(io);
  setupNotificationSocket(io);
  setupBookingSocket(io);

  // Start listening
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.IO: http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
