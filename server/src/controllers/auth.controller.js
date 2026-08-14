/**
 * Authentication Controller (controllers/auth.controller.js)
 * HTTP request handlers for user registration, login, logout, and session profile.
 */

const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Register a new user account
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.signupUser({ name, email, password });

  // Set httpOnly session cookie
  res.cookie('token', token, authService.getCookieOptions());

  return ApiResponse.created(
    res,
    {
      user,
      token
    },
    'Account created successfully'
  );
});

/**
 * @desc    Authenticate user credentials and start session
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser({ email, password });

  // Set httpOnly session cookie
  res.cookie('token', token, authService.getCookieOptions());

  return ApiResponse.success(
    res,
    {
      user,
      token
    },
    'Logged in successfully'
  );
});

/**
 * @desc    Terminate session and clear authentication cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
  // Clear the httpOnly cookie with matching path/options
  res.clearCookie('token', authService.getCookieOptions());

  return ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Get currently authenticated user details
 * @route   GET /api/auth/me
 * @access  Protected
 */
const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'Current user profile retrieved');
});

module.exports = {
  signup,
  login,
  logout,
  getMe
};
