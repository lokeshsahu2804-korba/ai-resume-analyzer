/**
 * User Profile & Account Business Logic Service (services/user.service.js)
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Retrieves full user profile and account limits by user ID.
 *
 * @param {string} userId - User MongoDB ObjectId
 * @returns {Promise<Object>} User document
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }
  return user;
};

/**
 * Updates editable profile and personal details for a user.
 *
 * @param {string} userId - User ID
 * @param {Object} data - Update fields ({ name, phone, location, linkedin, github, portfolio, bio })
 * @returns {Promise<Object>} Updated user document
 */
const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  // Update top-level name if provided
  if (data.name !== undefined) {
    user.name = data.name.trim();
  }

  // Update embedded profile fields
  const profileFields = ['phone', 'location', 'linkedin', 'github', 'portfolio', 'bio'];
  profileFields.forEach((field) => {
    if (data[field] !== undefined) {
      user.profile[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
    }
  });

  await user.save();
  return user;
};

/**
 * Verifies current password and updates to new password.
 *
 * @param {string} userId - User ID
 * @param {Object} data - { currentPassword, newPassword }
 * @returns {Promise<void>}
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  // 1. Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  // 2. Set new password (pre-save hook will hash with 12 rounds)
  user.password = newPassword;
  await user.save();
};

/**
 * Retrieves subscription tier and monthly quota metrics for a user.
 *
 * @param {string} userId - User ID
 * @returns {Promise<{ subscription: Object, usageLimits: Object }>}
 */
const getSubscriptionInfo = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }

  return {
    subscription: user.subscription,
    usageLimits: user.usageLimits,
    plan: user.plan
  };
};

/**
 * Hard deletes a user account.
 *
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteAccount = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw ApiError.notFound('User account not found');
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getSubscriptionInfo,
  deleteAccount
};
