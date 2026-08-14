/**
 * Express Application Setup (app.js)
 * Configures global middleware chain, API route mounting, and centralized error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Import middleware and routes
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const routes = require('./routes');

const app = express();

// ---------------------------------------------------------------------------
// 1. Core Security & Pre-Routing Middleware
// ---------------------------------------------------------------------------

// Set security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5500',
    credentials: true
  })
);

// Apply rate limiting to all /api requests
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser (for JWT session cookies)
app.use(cookieParser());

// HTTP Request Logging (disabled during automated test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---------------------------------------------------------------------------
// 2. API Routes
// ---------------------------------------------------------------------------

// Mount all modular routes under /api
app.use('/api', routes);

// ---------------------------------------------------------------------------
// 3. Post-Routing & Error Handling Middleware
// ---------------------------------------------------------------------------

// Catch unmatched routes (404)
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

module.exports = app;
