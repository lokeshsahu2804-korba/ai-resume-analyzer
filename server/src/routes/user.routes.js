/**
 * User Profile & Account Routes (user.routes.js)
 * Endpoints for managing user profiles, password changes, subscription limits, and account lifecycle.
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { updateProfileSchema, changePasswordSchema } = require('../validators/user.validator');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/me', requireAuth, userController.getProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update editable profile details
 * @access  Protected
 */
router.put('/profile', requireAuth, validate(updateProfileSchema), userController.updateProfile);

/**
 * @route   PUT /api/users/password
 * @desc    Change account password
 * @access  Protected
 */
router.put('/password', requireAuth, validate(changePasswordSchema), userController.changePassword);

/**
 * @route   GET /api/users/subscription
 * @desc    Get user subscription tier and usage limits
 * @access  Protected
 */
router.get('/subscription', requireAuth, userController.getSubscription);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account and clear session
 * @access  Protected
 */
router.delete('/account', requireAuth, userController.deleteAccount);

module.exports = router;
