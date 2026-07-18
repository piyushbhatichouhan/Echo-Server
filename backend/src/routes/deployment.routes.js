const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const deploymentController = require("../controllers/deployment.controller");

router.post(
  "/projects/:id/deploy",
  authenticate,
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
  deploymentController.redeployProject,
);

module.exports = router;
