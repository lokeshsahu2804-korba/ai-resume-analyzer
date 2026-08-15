/**
 * Admin Management Routes (routes/admin.routes.js)
 * Endpoints for platform statistics, live system diagnostics, user management, role mutation, and account deletion.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/authorize.middleware');
const validate = require('../middleware/validate.middleware');
const {
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserPlanSchema
} = require('../validators/admin.validator');

// All admin routes strictly require authentication and admin authorization
router.use(requireAuth, requireRole('admin'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get real-time platform statistics aggregated from MongoDB
 * @access  Protected (Admin only)
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/admin/health-check
 * @desc    Get live system health report across Express, MongoDB Atlas, and FastAPI
 * @access  Protected (Admin only)
 */
router.get('/health-check', adminController.getHealth);

/**
 * @route   GET /api/admin/users
 * @desc    List registered users with search, role/plan filters, and pagination
 * @access  Protected (Admin only)
 */
router.get('/users', validate(listUsersQuerySchema, 'query'), adminController.listUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user account details and activity summary
 * @access  Protected (Admin only)
 */
router.get('/users/:id', adminController.getUserDetails);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role (user <-> admin) with self-demotion protection
 * @access  Protected (Admin only)
 */
router.put('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole);

/**
 * @route   PUT /api/admin/users/:id/plan
 * @desc    Update user subscription plan (free <-> premium) and analysis quota limit
 * @access  Protected (Admin only)
 */
router.put('/users/:id/plan', validate(updateUserPlanSchema), adminController.updateUserPlan);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Permanently delete a user account with cascading cleanup of all dependent records and files
 * @access  Protected (Admin only)
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
