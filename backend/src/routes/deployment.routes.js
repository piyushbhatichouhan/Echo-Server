const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const { deploymentLimiter } = require("../middleware/rateLimit.middleware");

const deploymentController = require("../controllers/deployment.controller");

router.post(
  "/projects/:id/deploy",
  authenticate,
  deploymentLimiter,
  deploymentController.deployProject,
);

router.post(
  "/projects/:projectId/start",
  authenticate,
  deploymentController.startProject,
);

router.post(
  "/projects/:projectId/stop",
  authenticate,
  deploymentController.stopProject,
);

router.post(
  "/projects/:projectId/restart",
  authenticate,
  deploymentController.restartProject,
);

router.post(
  "/projects/:projectId/redeploy",
  authenticate,
  deploymentLimiter,
  deploymentController.redeployProject,
);

module.exports = router;
