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

    const logs = await deploymentLogService.getLogs(projectId, req.query);

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

const frameworkDetector = require("../services/frameworkDetector.service");
const projectSettingsService = require("../services/projectSettings.service");
const containerService = require("../services/container.service");

const detectFramework = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await projectService.verifyProjectOwnership(projectId, ownerId);

    const detection = await frameworkDetector.detectFramework(projectId);

    res.json({
      success: true,
      data: detection,
    });
  } catch (error) {
    next(error);
  }
};

const applyDetectedPreset = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await projectService.verifyProjectOwnership(projectId, ownerId);

    const detection = await frameworkDetector.detectFramework(projectId);
    const updated = await projectSettingsService.updateProjectSettings(
      projectId,
      ownerId,
      {
        runtime: detection.runtime || "node",
        working_directory: detection.working_directory || ".",
        install_command: detection.install_command ?? "",
        build_command: detection.build_command ?? "",
        start_command: detection.start_command ?? "",
        output_directory: detection.output_directory || ".",
        dockerfile: detection.dockerfile ?? "",
      },
    );

    if (detection.runtime) {
      await projectService.updateApplicationType(projectId, detection.runtime);
    }

    res.json({
      success: true,
      message: `Applied ${detection.framework || detection.runtime} preset successfully.`,
      data: {
        framework: detection.framework || detection.runtime,
        settings: updated,
      },
    });
  } catch (error) {
    next(error);
  }
};

const rollbackDeployment = async (req, res, next) => {
  try {
    const { projectId, deploymentId } = req.params;
    const ownerId = req.user.id;

    const rolledBack = await deploymentService.rollbackDeployment(
      projectId,
      ownerId,
      deploymentId,
    );

    res.json({
      success: true,
      message: "Deployment rolled back successfully.",
      data: rolledBack,
    });
  } catch (error) {
    next(error);
  }
};

const getTelemetry = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const ownerId = req.user.id;

    await projectService.verifyProjectOwnership(projectId, ownerId);

    const telemetry = await containerService.getContainerTelemetry(projectId);

    res.json({
      success: true,
      data: telemetry,
    });
  } catch (error) {
    next(error);
  }
};

const executeTerminal = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { command } = req.body;
    const ownerId = req.user.id;

    await projectService.verifyProjectOwnership(projectId, ownerId);

    if (!command || typeof command !== "string") {
      return res.status(400).json({
        success: false,
        message: "Command string is required.",
      });
    }

    const result = await containerService.executeTerminalCommand(
      projectId,
      command,
    );

    res.json({
      success: true,
      data: result,
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
  detectFramework,
  applyDetectedPreset,
  rollbackDeployment,
  getTelemetry,
  executeTerminal,
};
