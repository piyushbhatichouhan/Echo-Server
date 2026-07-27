const applicationService = require("./application.service");
const environmentService = require("./environment.service");
const { verifyProjectOwnership } = require("./project.service");
const imageService = require("./image.service");
const containerService = require("./container.service");
const deploymentRepository = require("../repositories/deployment.repository");

const deploymentLogService = require("./deployment-log.service");
const { getRuntime } = require("../runtime");

const projectService = require("./project.service");
const workspaceService = require("./workspace.service");
const path = require("path");
const fs = require("fs/promises");
const { pool } = require("../config/database");
const gitService = require("./git.service");

const projectSettingsService = require("./projectSettings.service");

const deployProject = async (projectId, ownerId) => {
  let deployment;
  let container;

  try {
    await projectService.verifyProjectOwnership(projectId, ownerId);

    const repository = await gitService.getRepository(projectId, ownerId);

    if (repository) {
      await gitService.updateRepository(projectId, ownerId);
    }

    const project = await projectService.getProjectById(projectId, ownerId);
    console.log("PROJECT:", project);
    const application = await applicationService.getApplication(
      projectId,
      ownerId,
    );
    console.log(application);
    const environment = await environmentService.getEnvironmentVariables(
      projectId,
      ownerId,
    );

    const settings = await projectSettingsService.getProjectSettings(
      projectId,
      ownerId,
    );

    const port = settings.port;

    if (!port) {
      throw new Error("Project has no assigned port.");
    }

    try {
      await imageService.removeImage(imageService.getImageName(projectId));
    } catch {}
    const containerName = containerService.getContainerName(projectId);

    await deploymentRepository.stopDeployments(projectId);

    deployment = await deploymentRepository.createDeployment(
      projectId,
      null, // image doesn't exist yet
      containerName,
      port,
    );

    await deploymentRepository.updateDeploymentStatus(
      deployment.id,
      "building",
    );

    await deploymentLogService.addLog(
      deployment.id,
      "Building Docker image...",
    );

    const imageName = await imageService.buildImage(
      projectId,
      application,
      async (message) => {
        if (deployment) {
          await deploymentLogService.addLog(deployment.id, message);
        }
      },
    );
    await deploymentRepository.updateDeploymentImage(deployment.id, imageName);
    await deploymentLogService.addLog(deployment.id, "Deployment started.");
    await containerService.stopContainerByProject(projectId);

    await containerService.removeContainerByProject(projectId);

    console.log({
      projectPort: project.port,
      portVariable: port,
    });

    await deploymentRepository.updateDeploymentStatus(
      deployment.id,
      "creating_container",
    );

    await deploymentLogService.addLog(deployment.id, "Creating container...");

    container = await containerService.createContainer(
      projectId,
      imageName,
      port,
      environment,
    );
    await deploymentLogService.addLog(deployment.id, "Starting container...");
    await deploymentRepository.updateDeploymentStatus(
      deployment.id,
      "starting_container",
    );
    await deploymentRepository.markStoppedByUser(projectId, false);
    await containerService.startContainer(container, deployment.id);

    await deploymentLogService.addLog(
      deployment.id,
      "Container started successfully.",
    );

    await deploymentRepository.updateDeploymentStatus(deployment.id, "running");

    await deploymentLogService.addLog(deployment.id, "Container is running.");

    await deploymentLogService.addLog(
      deployment.id,
      "Deployment completed successfully.",
    );

    return deployment;
  } catch (error) {
    if (deployment) {
      await deploymentLogService.addLog(
        deployment.id,
        `Deployment failed: ${error.message}`,
      );
    }

    if (deployment) {
      await deploymentRepository.updateDeploymentStatus(
        deployment.id,
        "failed",
      );
    }

    if (container) {
      await containerService.removeContainer(container);
      try {
        await imageService.removeImage(imageService.getImageName(projectId));
      } catch {}
    }

    throw error;
  }
};

const stopProject = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const deployment = await deploymentRepository.getLatestDeployment(projectId);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await deploymentLogService.addLog(deployment.id, "Stopping container...");
  await deploymentRepository.markStoppedByUser(projectId, true);
  await containerService.stopContainer(projectId);

  await deploymentLogService.addLog(
    deployment.id,
    "Container stopped successfully.",
  );

  await deploymentRepository.updateDeploymentStatus(deployment.id, "stopped");

  await deploymentLogService.addLog(deployment.id, "Project is now offline.");

  return {
    message: "Project stopped successfully",
  };
};

const startProject = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const deployment = await deploymentRepository.getLatestDeployment(projectId);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await deploymentLogService.addLog(deployment.id, "Starting container...");
  await deploymentRepository.markStoppedByUser(projectId, false);
  await containerService.startContainerByProject(projectId, deployment.id);

  await deploymentLogService.addLog(
    deployment.id,
    "Container started successfully.",
  );

  await deploymentRepository.updateDeploymentStatus(deployment.id, "running");

  await deploymentLogService.addLog(deployment.id, "Project is now online.");

  return {
    message: "Project started successfully",
  };
};

const restartProject = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const deployment = await deploymentRepository.getLatestDeployment(projectId);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await deploymentLogService.addLog(deployment.id, "Restarting container...");
  await deploymentRepository.markStoppedByUser(projectId, false);
  await containerService.restartContainer(projectId, deployment.id);

  await deploymentLogService.addLog(
    deployment.id,
    "Container restarted successfully.",
  );

  await deploymentRepository.updateDeploymentStatus(deployment.id, "running");

  await deploymentLogService.addLog(deployment.id, "Project is back online.");

  return {
    message: "Project restarted successfully",
  };
};

const getProjectDeployments = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return await deploymentRepository.getProjectDeployments(projectId);
};

const getDeploymentStatus = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const status = await containerService.getContainerStatus(projectId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const repository = await gitService.getRepository(projectId, ownerId);

  if (!settings) {
    return {
      status: "Not Deployed",
    };
  }

  return {
    ...status,

    runtime: settings.runtime,

    port: settings.port,

    workingDirectory: settings.working_directory,

    repository: repository?.repository_name ?? null,

    branch: repository?.branch ?? null,
  };
};

const redeployProject = async (projectId, ownerId) => {
  return await deployProject(projectId, ownerId);
};

const createDeploymentProject = async (projectId, ownerId) => {
  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const workspaceRoot = workspaceService.getProjectFilesDirectory(projectId);

  const workspace = path.resolve(
    workspaceRoot,
    settings.working_directory || ".",
  );

  try {
    await fs.access(workspace);
  } catch {
    throw new Error(
      `Working directory "${settings.working_directory}" does not exist.`,
    );
  }

  return {
    projectId,
    workspace,
    runtime: settings.runtime,
    install_command: settings.install_command,
    build_command: settings.build_command,
    start_command: settings.start_command,
    working_directory: settings.working_directory,
    port: settings.port,
    environment: process.env,
  };
};

const deploy = async (projectId, ownerId) => {
  try {
    await projectService.verifyProjectOwnership(projectId, ownerId);

    const project = await createDeploymentProject(projectId, ownerId);

    const runtime = getRuntime(project.runtime);

    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='building',
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId],
    );

    await runtime.install(project);

    await runtime.build(project);

    const process = await runtime.start(projectId, project);

    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='running',
          process_id=$2,
          runtime_directory=$3,
          started_at=NOW(),
          last_deployed_at=NOW(),
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId, process.pid, project.workspace],
    );

    return {
      running: true,
      pid: process.pid,
    };
  } catch (error) {
    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='failed',
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId],
    );

    throw error;
  }
};

module.exports = {
  deployProject,
  getProjectDeployments,
  getDeploymentStatus,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
  deploy,
};
