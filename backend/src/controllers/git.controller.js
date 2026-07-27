const {
  getRepository,
  validateRepository,
  connectRepository,
  disconnectRepository,
  cloneRepository,
  commitChanges,
  pullRepository,
  pushRepository,
  fetchRepository,
} = require("../services/git.service");
const gitService = require("../services/git.service");

const { syncWorkspaceToGit } = require("../services/workspace.sync.service");

const getProjectRepository = async (req, res, next) => {
  try {
    const repository = await getRepository(req.params.id, req.user.id);

    res.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(error);
  }
};

const validateProjectRepository = async (req, res, next) => {
  try {
    const result = await validateRepository(
      req.params.id,
      req.user.id,
      req.body.url,
      req.body.branch,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const connectProjectRepository = async (req, res, next) => {
  try {
    const repository = await gitService.connectRepository(
      req.params.id,
      req.user.id,
      req.body.url,
      req.body.branch,
    );

    res.json({
      success: true,
      data: repository,
    });
  } catch (error) {
    next(error);
  }
};

const disconnectProjectRepository = async (req, res, next) => {
  try {
    await disconnectRepository(req.params.id, req.user.id);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

const cloneProjectRepository = async (req, res, next) => {
  try {
    await cloneRepository(req.params.id, req.user.id);

    res.json({
      success: true,
    });
  } catch (err) {
    next(err);
  }
};

const getProjectGitStatus = async (req, res, next) => {
  try {
    const status = await gitService.getGitStatus(req.params.id, req.user.id);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

const commitProjectChanges = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      const error = new Error("Commit message is required");
      error.status = 400;
      throw error;
    }

    // ⭐ Synchronize workspace → Git
    await syncWorkspaceToGit(req.params.id);

    const result = await gitService.commitChanges(
      req.params.id,
      req.user.id,
      message.trim(),
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const pullRepositoryController = async (req, res, next) => {
  try {
    const result = await gitService.pullRepository(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const pushRepositoryController = async (req, res, next) => {
  try {
    const result = await gitService.pushRepository(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const fetchRepositoryController = async (req, res, next) => {
  try {
    const result = await gitService.fetchRepository(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (err) {
    next(err);
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
};
