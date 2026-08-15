/**
 * Socket.IO Server Configuration (config/socket.js)
 * Manages real-time WebSocket connections, JWT authentication handshake, user-scoped private rooms, and notification broadcasts.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

/**
 * Parses cookies from cookie header string.
 * @param {string} [cookieStr='']
 * @returns {Object}
 */
const parseCookies = (cookieStr = '') => {
  const list = {};
  if (!cookieStr) return list;
  cookieStr.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
};

/**
 * Initializes Socket.IO on the provided HTTP server.
 *
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5001'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, test runners) or matching allowed list
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Blocked by Socket.IO CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Check Authorization Header if auth token not in payload
      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      // Check HTTP Cookies as fallback
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        token = cookies.token;
      }

      if (!token) {
        return next(new Error('Authentication required: Missing JWT token'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded._id || decoded.userId;

      if (!userId) {
        return next(new Error('Invalid token payload: missing user identifier'));
      }

      socket.user = decoded;
      socket.userId = userId.toString();
      return next();
    } catch (err) {
      logger.warn(`Socket authentication failed: ${err.message}`);
      return next(new Error('Authentication failed: Invalid or expired token'));
    }
  });

  // Connection Handler
  io.on('connection', (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    logger.info(`Socket client connected [id: ${socket.id}] joined room: ${userRoom}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket client disconnected [id: ${socket.id}]: ${reason}`);
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance.
 *
 * @returns {Server|null}
 */
const getIO = () => io;

/**
 * Emits a real-time event safely to a specific user's private room.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} event
 * @param {any} payload
 * @returns {boolean} True if emitted successfully, false otherwise
 */
const emitToUser = (userId, event, payload) => {
  if (!io) {
    logger.debug(`Socket.IO not initialized; skipping real-time emission of event '${event}'`);
    return false;
  }

  try {
    const room = `user:${userId.toString()}`;
    io.to(room).emit(event, payload);
    logger.debug(`Real-time event '${event}' emitted to room '${room}'`);
    return true;
  } catch (err) {
    logger.warn(`Failed to emit real-time event '${event}' to user ${userId}: ${err.message}`);
    return false;
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser
};
