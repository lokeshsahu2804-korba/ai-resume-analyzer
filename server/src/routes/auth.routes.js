/**
 * Authentication Routes (auth.routes.js)
 * Signup, login, logout, and session profile endpoints.
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { signupSchema, loginSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user account
 * @access  Public
 */
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & issue session cookie
 * @access  Public
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Protected
 */
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
