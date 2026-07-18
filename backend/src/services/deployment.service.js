const projectService = require("./project.service");
const applicationService = require("./application.service");
const environmentService = require("./environment.service");
const { verifyProjectOwnership } = require("./project.service");
const imageService = require("./image.service");
const containerService = require("./container.service");
const deploymentRepository = require("../repositories/deployment.repository");
const healthService = require("./health.service");
const deploymentLogService = require("./deployment-log.service");

const deployProject = async (projectId, ownerId) => {
  let deployment;
  let container;

  try {
    await projectService.verifyProjectOwnership(projectId, ownerId);

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
    const port = project.port;

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
    await containerService.startContainer(container, deployment.id);

    await deploymentLogService.addLog(
      deployment.id,
      "Container started successfully.",
    );

    await deploymentLogService.addLog(
      deployment.id,
      "Waiting for health check...",
    );

    await deploymentRepository.updateDeploymentStatus(
      deployment.id,
      "health_check",
    );
    const healthy = await healthService.waitForHealth(port);

    if (!healthy) {
      throw new Error("Health check failed.");
    } else {
      await deploymentLogService.addLog(deployment.id, "Health check passed.");
    }

    await deploymentRepository.updateDeploymentStatus(deployment.id, "running");
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

  return await containerService.getContainerStatus(projectId);
};

const redeployProject = async (projectId, ownerId) => {
  return await deployProject(projectId, ownerId);
};

module.exports = {
  deployProject,
  getProjectDeployments,
  getDeploymentStatus,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
};
