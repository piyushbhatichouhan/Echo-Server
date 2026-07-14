const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../services/project.service");

const deploymentLogService = require("../services/deployment-log.service");
const deploymentService = require("../services/deployment.service");
const logStreamService = require("../services/log-stream.service");
const projectService = require("../services/project.service");

const getProjectLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await projectService.verifyProjectOwnership(projectId, ownerId);

    const logs = await deploymentLogService.getLogs(projectId);

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const project = await createProject(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const projects = await getProjects(req.user.id);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id, req.user.id);

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const project = await updateProject(req.params.id, req.user.id, req.body);

    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const project = await deleteProject(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Project deleted successfully",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

const getProjectDeployments = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    const deployments = await deploymentService.getProjectDeployments(
      projectId,
      ownerId,
    );

    res.json(deployments);
  } catch (error) {
    next(error);
  }
};

const getDeploymentStatus = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    const status = await deploymentService.getDeploymentStatus(
      projectId,
      ownerId,
    );

    res.json(status);
  } catch (error) {
    next(error);
  }
};

const streamLogs = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    // Verify ownership
    await projectService.verifyProjectOwnership(projectId, ownerId);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Flush headers immediately
    res.flushHeaders?.();

    // Initial message
    res.write(
      `data: ${JSON.stringify({
        message: "Connected to log stream",
      })}\n\n`,
    );

    // Register client
    logStreamService.subscribe(projectId, res);

    // Remove client when browser disconnects
    req.on("close", () => {
      logStreamService.unsubscribe(projectId, res);
      res.end();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  getProjectLogs,
  getProjectDeployments,
  getDeploymentStatus,
  streamLogs,
};
