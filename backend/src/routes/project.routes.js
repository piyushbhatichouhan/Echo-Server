const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const validate = require("../middleware/validation.middleware");

const projectController = require("../controllers/project.controller");

const {
  createProjectValidation,
  updateProjectValidation,
} = require("../validators/project.validator");

const {
  create,
  list,
  getById,
  update,
  remove,
} = require("../controllers/project.controller");

router.post("/", authenticate, createProjectValidation, validate, create);
router.get("/", authenticate, list);
router.get("/:id", authenticate, getById);
router.patch("/:id", authenticate, updateProjectValidation, validate, update);
router.delete("/:id", authenticate, remove);
router.get("/:projectId/logs", authenticate, projectController.getProjectLogs);
router.get(
  "/:projectId/deployments",
  authenticate,
  projectController.getProjectDeployments,
);
router.get(
  "/:projectId/status",
  authenticate,
  projectController.getDeploymentStatus,
);

router.get("/:projectId/logs/live", authenticate, projectController.streamLogs);

module.exports = router;
