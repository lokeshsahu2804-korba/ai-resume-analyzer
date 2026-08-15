/**
 * Admin Controller (controllers/admin.controller.js)
 * HTTP handlers for platform metrics, system health, user administration, role updates, plan changes, and cascading deletions.
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const adminService = require('../services/admin.service');

/**
 * GET /api/admin/stats
 * Retrieves real-time platform statistics aggregated from MongoDB.
 */
const getStats = asyncHandler(async (req, res) => {
  const analytics = await adminService.getPlatformAnalytics();
  return ApiResponse.success(res, analytics, 'Platform analytics retrieved successfully', 200);
});

/**
 * GET /api/admin/health-check
 * Retrieves live system diagnostics across Express, MongoDB Atlas, and FastAPI.
 */
const getHealth = asyncHandler(async (req, res) => {
  const health = await adminService.getSystemHealth();
  return ApiResponse.success(res, health, 'System health report retrieved successfully', 200);
});

/**
 * GET /api/admin/users
 * Retrieves paginated list of registered users with search and filters.
 */
const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = '', role = '', plan = '', sort = '-createdAt' } = req.query;

  const result = await adminService.listUsers({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    search,
    role,
    plan,
    sort
  });

  return ApiResponse.success(res, result, 'Users retrieved successfully', 200);
});

/**
 * GET /api/admin/users/:id
 * Retrieves full user details and activity records.
 */
const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const details = await adminService.getUserDetails(id);
  return ApiResponse.success(res, details, 'User details retrieved successfully', 200);
});

/**
 * PUT /api/admin/users/:id/role
 * Updates a user's role (user <-> admin) with self-demotion protection.
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const user = await adminService.updateUserRole(req.user._id, id, role);
  return ApiResponse.success(res, { user }, 'User role updated successfully', 200);
});

/**
 * PUT /api/admin/users/:id/plan
 * Updates a user's subscription plan and analysis quota.
 */
const updateUserPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { plan, resumeAnalysesLimit, resumeAnalysesUsed } = req.body;

  const user = await adminService.updateUserPlan(id, {
    plan,
    resumeAnalysesLimit,
    resumeAnalysesUsed
  });

  return ApiResponse.success(res, { user }, 'User plan updated successfully', 200);
});

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes a user account with cascading cleanup.
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await adminService.deleteUserCascade(req.user._id, id);
  return ApiResponse.success(res, result, 'User account and associated records deleted permanently', 200);
});

module.exports = {
  getStats,
  getHealth,
  listUsers,
  getUserDetails,
  updateUserRole,
  updateUserPlan,
  deleteUser
};
