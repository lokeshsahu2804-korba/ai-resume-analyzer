/**
 * User Profile Controller (controllers/user.controller.js)
 * HTTP request handlers for user profile CRUD, password change, subscription info, and account deletion.
 */

const userService = require('../services/user.service');
const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Protected
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  return ApiResponse.success(res, { user }, 'Profile retrieved successfully');
});

/**
 * @desc    Update user profile details
 * @route   PUT /api/users/profile
 * @access  Protected
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, { user }, 'Profile updated successfully');
});

/**
 * @desc    Change user account password
 * @route   PUT /api/users/password
 * @access  Protected
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changePassword(req.user._id, { currentPassword, newPassword });
  return ApiResponse.success(res, null, 'Password updated successfully');
});

/**
 * @desc    Get user subscription tier and analysis usage limits
 * @route   GET /api/users/subscription
 * @access  Protected
 */
const getSubscription = asyncHandler(async (req, res) => {
  const data = await userService.getSubscriptionInfo(req.user._id);
  return ApiResponse.success(res, data, 'Subscription details retrieved');
});

/**
 * @desc    Delete user account and clear session cookie
 * @route   DELETE /api/users/account
 * @access  Protected
 */
const deleteAccount = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user._id);

  // Clear authentication session cookie
  res.clearCookie('token', authService.getCookieOptions());

  return ApiResponse.success(res, null, 'Account deleted successfully');
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getSubscription,
  deleteAccount
};
