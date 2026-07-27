const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
  getProjectRepository,
  validateProjectRepository,
  connectProjectRepository,
  disconnectProjectRepository,
  cloneProjectRepository,
  getProjectGitStatus,
  commitProjectChanges,
  pullRepositoryController,
  pushRepositoryController,
  fetchRepositoryController,
} = require("../controllers/git.controller");

router.get("/projects/:id/git", authenticate, getProjectRepository);
router.post("/:projectId/pull", authenticate, pullRepositoryController);

router.post("/:projectId/push", authenticate, pushRepositoryController);

router.post("/:projectId/fetch", authenticate, fetchRepositoryController);
router.post(
  "/projects/:id/git/validate",
  authenticate,
  validateProjectRepository,
);

router.post("/projects/:id/git", authenticate, connectProjectRepository);

router.delete("/projects/:id/git", authenticate, disconnectProjectRepository);

router.post("/projects/:id/git/clone", authenticate, cloneProjectRepository);

router.get("/projects/:id/git/status", authenticate, getProjectGitStatus);

router.post("/projects/:id/git/commit", authenticate, commitProjectChanges);

module.exports = router;
