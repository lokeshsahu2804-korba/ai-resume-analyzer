/**
 * HTTP Server Entry Point (server.js)
 * Initializes database connection and starts Express HTTP listener.
 */

require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB Database
connectDB();

// Start Express HTTP Server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = server;
