/**
 * Authentication Business Logic Service (services/auth.service.js)
 * Handles user signup, login verification, token generation, and cookie options.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Generates a signed JWT access token containing essential user claims.
 *
 * @param {Object} user - User document
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw ApiError.internal('JWT_SECRET is not configured in server environment');
  }

  const payload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    plan: user.plan
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Standard cookie configuration options for storing authentication tokens.
 *
 * @returns {import('express').CookieOptions} Cookie options
 */
const getCookieOptions = () => {
  const days = parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 7;
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Prevents JavaScript/XSS access
    secure: isProduction, // Enforces HTTPS in production
    sameSite: 'lax', // Protects against CSRF attacks
    maxAge: days * 24 * 60 * 60 * 1000 // Milliseconds
  };
};

/**
 * Registers a new user account with duplicate email validation.
 *
 * @param {Object} data - { name, email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
const signupUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check for existing account
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address already exists');
  }

  // 2. Create new user (pre-save hook hashes password)
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    password
  });

  await user.save();

  // 3. Generate token
  const token = generateToken(user);

  return { user, token };
};

/**
 * Authenticates user credentials and returns session token.
 *
 * @param {Object} data - { email, password }
 * @returns {Promise<{ user: Object, token: string }>}
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Find user by email
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    // Generic error message prevents account enumeration
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 2. Compare password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // 3. Generate token
  const token = generateToken(user);

  return { user, token };
};

module.exports = {
  generateToken,
  getCookieOptions,
  signupUser,
  loginUser
};
