const gitService = require("../services/git.service");
const { syncWorkspaceToGit } = require("../services/workspace.sync.service");

const normalizeGitError = (err) => {
  if (!err) return err;
  if (!err.status || err.status >= 500) {
    err.status = 400;
  }
  err.isUserError = true;
  return err;
};

const getProjectRepository = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const repository = await gitService.getRepository(projectId, req.user.id);

    res.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const validateProjectRepository = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const token = req.body.token || req.body.accessToken || null;
    const result = await gitService.validateRepository(
      projectId,
      req.user.id,
      req.body.url,
      req.body.branch,
      token,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const connectProjectRepository = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const token = req.body.token || req.body.accessToken || null;
    const repository = await gitService.connectRepository(
      projectId,
      req.user.id,
      req.body.url,
      req.body.branch,
      token,
    );

    res.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const disconnectProjectRepository = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    await gitService.disconnectRepository(projectId, req.user.id);

    res.json({
      success: true,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const cloneProjectRepository = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    await gitService.cloneRepository(projectId, req.user.id);

    res.json({
      success: true,
    });
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const getProjectGitStatus = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const status = await gitService.getGitStatus(projectId, req.user.id);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const commitProjectChanges = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      const error = new Error("Commit message is required");
      error.status = 400;
      error.isUserError = true;
      throw error;
    }

    // Synchronize workspace → Git
    await syncWorkspaceToGit(projectId);

    const result = await gitService.commitChanges(
      projectId,
      req.user.id,
      message.trim(),
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(normalizeGitError(error));
  }
};

const pullRepositoryController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const result = await gitService.pullRepository(
      projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const pushRepositoryController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const result = await gitService.pushRepository(
      projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const fetchRepositoryController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const result = await gitService.fetchRepository(
      projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const getProjectCommitsController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const limit = parseInt(req.query.limit, 10) || 15;
    const commits = await gitService.getCommits(projectId, req.user.id, limit);

    res.json({
      success: true,
      data: commits,
    });
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const getProjectBranchesController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const branches = await gitService.getBranches(projectId, req.user.id);

    res.json({
      success: true,
      data: branches,
    });
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const switchProjectBranchController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const { branch } = req.body;
    if (!branch) {
      const error = new Error("Branch name is required");
      error.status = 400;
      error.isUserError = true;
      throw error;
    }

    const result = await gitService.switchBranch(projectId, req.user.id, branch);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(normalizeGitError(err));
  }
};

const getProjectDiffController = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const file = req.query.file || null;
    const diff = await gitService.getDiff(projectId, req.user.id, file);

    res.json({
      success: true,
      data: diff,
    });
  } catch (err) {
    next(normalizeGitError(err));
  }
};

module.exports = {
  getProjectRepository,
  connectProjectRepository,
  validateProjectRepository,
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
};
