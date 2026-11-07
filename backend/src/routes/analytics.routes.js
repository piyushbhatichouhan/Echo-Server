const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");
const controller = require("../controllers/analytics.controller");

// Per-project analytics endpoints
router.get("/projects/:projectId/analytics", authenticate, controller.getProjectAnalytics);
router.post("/projects/:projectId/analytics/simulate", authenticate, controller.simulateTraffic);
router.delete("/projects/:projectId/analytics", authenticate, controller.clearProjectAnalytics);

// Real HTTP telemetry ingestion endpoint (used by router/proxy/log shipping)
router.post("/analytics/ingest", controller.ingestTraffic);

// SuperAdmin per-user analytics endpoint
router.get("/server/analytics/users", authenticate, requireOwner, controller.getSuperAdminUserAnalytics);

module.exports = router;
