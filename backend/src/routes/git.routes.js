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
  getProjectCommitsController,
  getProjectBranchesController,
  switchProjectBranchController,
  getProjectDiffController,
} = require("../controllers/git.controller");

// Standard REST routes under /projects/:id/git/*
router.get("/projects/:id/git", authenticate, getProjectRepository);
router.post("/projects/:id/git", authenticate, connectProjectRepository);
router.delete("/projects/:id/git", authenticate, disconnectProjectRepository);
router.post(
  "/projects/:id/git/validate",
  authenticate,
  validateProjectRepository,
);
router.post("/projects/:id/git/clone", authenticate, cloneProjectRepository);
router.get("/projects/:id/git/status", authenticate, getProjectGitStatus);
router.post("/projects/:id/git/commit", authenticate, commitProjectChanges);
router.post("/projects/:id/git/pull", authenticate, pullRepositoryController);
router.post("/projects/:id/git/push", authenticate, pushRepositoryController);
router.post("/projects/:id/git/fetch", authenticate, fetchRepositoryController);
router.get("/projects/:id/git/commits", authenticate, getProjectCommitsController);
router.get("/projects/:id/git/branches", authenticate, getProjectBranchesController);
router.post("/projects/:id/git/branch", authenticate, switchProjectBranchController);
router.get("/projects/:id/git/diff", authenticate, getProjectDiffController);

// Backward compatibility routes
router.post("/:projectId/pull", authenticate, pullRepositoryController);
router.post("/:projectId/push", authenticate, pushRepositoryController);
router.post("/:projectId/fetch", authenticate, fetchRepositoryController);

module.exports = router;

