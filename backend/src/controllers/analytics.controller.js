const analyticsService = require("../services/analytics.service");

/**
 * Controller for retrieving project traffic analytics.
 */
const getProjectAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { timeRange = "24h" } = req.query;
    const isSuperAdmin = Boolean(req.user?.is_owner || req.user?.isOwner);

    const data = await analyticsService.getProjectAnalytics(
      projectId,
      timeRange,
      req.user.id,
      isSuperAdmin,
    );

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for triggering simulated traffic requests for testing.
 */
const simulateTraffic = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const count = parseInt(req.body?.count, 10) || 25;
    const isSuperAdmin = Boolean(req.user?.is_owner || req.user?.isOwner);

    const result = await analyticsService.simulateTraffic(
      projectId,
      count,
      req.user.id,
      isSuperAdmin,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for retrieving per-user traffic analytics for SuperAdmin Server Health.
 */
const getSuperAdminUserAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getSuperAdminUserAnalytics();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjectAnalytics,
  simulateTraffic,
  getSuperAdminUserAnalytics,
};
