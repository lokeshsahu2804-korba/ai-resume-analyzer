/**
 * MongoDB Database Connection Manager (config/db.js)
 * Manages Mongoose connection lifecycle, event monitoring, and graceful process termination.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Mongoose Connection Configuration Options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
  socketTimeoutMS: 45000,
  autoIndex: process.env.NODE_ENV !== 'production' // Auto-build indexes in development
};

/**
 * Connects to MongoDB Atlas or local MongoDB cluster.
 * Logs connection events and handles initial connection failures gracefully.
 *
 * @returns {Promise<typeof mongoose | null>}
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes('<username>') || uri.includes('<password>')) {
    logger.warn(
      'MONGODB_URI is not configured with valid credentials in .env. Database functionality will remain offline until a valid Atlas connection string is provided.'
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, mongooseOptions);
    logger.info(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    // In development, do not crash the Express server so endpoints/health can still be tested
    return null;
  }
};

// ---------------------------------------------------------------------------
// Mongoose Connection Event Listeners
// ---------------------------------------------------------------------------

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose connection disconnected');
});

// ---------------------------------------------------------------------------
// Graceful Process Termination Handler
// ---------------------------------------------------------------------------

const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('Mongoose connection closed through app termination');
  } catch (err) {
    logger.error(`Error closing Mongoose connection: ${err.message}`);
  }
};

process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDB
};
