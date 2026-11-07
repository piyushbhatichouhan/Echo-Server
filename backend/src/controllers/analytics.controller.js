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

/**
 * Controller for ingesting real HTTP traffic from Nginx Proxy Manager, Router, or edge webhooks.
 */
const ingestTraffic = async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: "Missing request body" });
    }

    if (Array.isArray(payload)) {
      const count = await analyticsService.ingestBatchTrafficEvents(payload);
      return res.json({ success: true, count });
    }

    if (Array.isArray(payload.events)) {
      const count = await analyticsService.ingestBatchTrafficEvents(payload.events);
      return res.json({ success: true, count });
    }

    const result = await analyticsService.ingestTrafficEvent({
      hostname: payload.hostname || req.headers["x-forwarded-host"] || req.headers.host,
      path: payload.path,
      method: payload.method,
      statusCode: payload.statusCode,
      responseTimeMs: payload.responseTimeMs,
      ip: payload.ip || req.ip,
      bytesSent: payload.bytesSent,
      timestamp: payload.timestamp,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller for purging/resetting historical traffic analytics for a project.
 */
const clearProjectAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const isSuperAdmin = Boolean(req.user?.is_owner || req.user?.isOwner);

    const result = await analyticsService.clearProjectAnalytics(
      projectId,
      req.user.id,
      isSuperAdmin,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjectAnalytics,
  simulateTraffic,
  clearProjectAnalytics,
  ingestTraffic,
  getSuperAdminUserAnalytics,
};
