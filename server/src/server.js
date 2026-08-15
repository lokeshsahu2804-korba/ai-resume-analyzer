/**
 * HTTP & WebSocket Server Entry Point (server.js)
 * Initializes database connection, mounts Socket.IO engine, and starts HTTP listener.
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB Database
connectDB();

// Create Node HTTP Server
const httpServer = http.createServer(app);

// Initialize Socket.IO Real-Time Engine
initSocket(httpServer);

// Start HTTP & WebSocket Server Listener
const server = httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info(`Socket.IO real-time alerts active`);
});

module.exports = server;
