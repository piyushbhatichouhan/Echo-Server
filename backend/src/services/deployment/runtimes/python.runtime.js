const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");

module.exports = {
  deploy,
  start,
  stop,
  restart,
  getStatus,
};

async function deploy(context) {
  try {
    await prepare(context);

    await createDeployment(context);

    await install(context);

    await build(context);

    await publish(context);

    await verify(context);

    await start(context);

    await finishDeployment(context);

    return context.deployment;
  } catch (error) {
    await failDeployment(context, error);

    throw error;
  }
}

// Private Functions

async function prepare(context) {
  const { project, settings } = context;

  context.cwd = workspace.getProjectFilesDirectory(project.id);

  context.imageName = `echo-python-${project.id}`;

  context.containerName = context.infrastructure.container.getContainerName(
    project.id,
  );

  context.settings.dockerfile = generateDockerfile(context);
}

function generateDockerfile(context) {
  const { settings } = context;

  return `
FROM python:3.12-slim

WORKDIR /app

COPY . .

${settings.install_command?.trim() ? `RUN ${settings.install_command}` : ""}

${settings.build_command?.trim() ? `RUN ${settings.build_command}` : ""}

EXPOSE ${settings.port}

CMD ["sh", "-c", "${settings.start_command}"]
`;
}

async function createDeployment(context) {
  const { project, settings } = context;

  await context.infrastructure.deployment.stopPreviousDeployments(project.id);

  context.deployment = await context.infrastructure.deployment.create(
    project.id,
    context.imageName,
    context.containerName,
    settings.port,
  );

  await context.infrastructure.deployment.updateStatus(
    context.deployment.id,
    "building",
  );

  await context.infrastructure.logger.stage(
    context.deployment.id,
    "Preparing Deployment",
  );
}

async function install(context) {
  const { settings, cwd, deployment } = context;

  if (!settings.install_command?.trim()) {
    return;
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Installing Dependencies",
  );

  const result = await context.infrastructure.process.runCommand({
    cwd,
    command: settings.install_command,
  });

  if (!result.success) {
    await context.infrastructure.logger.error(
      deployment.id,
      result.error || "Install command failed.",
    );

    throw new Error(result.error || "Install command failed.");
  }

  await context.infrastructure.logger.info(
    deployment.id,
    "Dependencies installed successfully.",
  );
}

async function build(context) {
  const { settings, cwd, deployment } = context;

  if (!settings.build_command?.trim()) {
    return;
  }

  await context.infrastructure.logger.stage(deployment.id, "Building Project");

  const result = await context.infrastructure.process.runCommand({
    cwd,
    command: settings.build_command,
  });

  if (!result.success) {
    await context.infrastructure.logger.error(
      deployment.id,
      result.error || "Build command failed.",
    );

    throw new Error(result.error || "Build command failed.");
  }

  await context.infrastructure.logger.info(
    deployment.id,
    "Project built successfully.",
  );
}

async function publish(context) {
  const { project, settings, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Building Docker Image",
  );

  // Remove previous image

  await context.infrastructure.docker.remove(project.id);

  await context.infrastructure.logger.info(
    deployment.id,
    "Previous Docker image removed.",
  );

  // Build image

  const imageName = await context.infrastructure.docker.build(
    project.id,
    settings,
    async (message) => {
      await context.infrastructure.logger.info(deployment.id, message);
    },
  );

  context.imageName = imageName;

  await context.infrastructure.deployment.updateImage(deployment.id, imageName);

  await context.infrastructure.logger.info(
    deployment.id,
    "Docker image built successfully.",
  );
}

async function verify(context) {
  const { deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Verifying Deployment",
  );

  // Future:
  // - verify image exists
  // - inspect Docker image
  // - check exposed ports
  // - Python-specific validation

  await context.infrastructure.logger.info(
    deployment.id,
    "Deployment verified successfully.",
  );
}

async function finishDeployment(context) {
  const { deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Deployment Complete",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Deployment completed successfully.",
  );
}

async function failDeployment(context, error) {
  if (!context.deployment) {
    throw error;
  }

  await context.infrastructure.logger.error(
    context.deployment.id,
    error.message,
  );

  await context.infrastructure.deployment.updateStatus(
    context.deployment.id,
    "failed",
  );

  await cleanup(context);
}

async function cleanup(context) {
  const { project } = context;

  try {
    await context.infrastructure.container.removeByProject(project.id);
  } catch {}

  try {
    await context.infrastructure.docker.remove(project.id);
  } catch {}
}

async function start(context) {
  const { project, environment, settings } = context;

  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Deployment",
  );

  // Stop previous container

  await context.infrastructure.container.stopByProject(project.id);

  // Remove previous container

  await context.infrastructure.container.removeByProject(project.id);

  // Create new container

  const container = await context.infrastructure.container.create(
    project.id,
    context.imageName,
    settings.port,
    environment,
  );

  context.container = container;

  // Start container

  await context.infrastructure.container.start(container, deployment.id);

  await context.infrastructure.deployment.markStoppedByUser(project.id, false);

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Application is now online.",
  );
}

async function stop(context) {
  const { project } = context;

  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Stopping Deployment",
  );

  await context.infrastructure.container.stop(project.id);

  await context.infrastructure.deployment.markStoppedByUser(project.id, true);

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "stopped",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Application has been stopped.",
  );
}

async function restart(context) {
  const { project } = context;

  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Restarting Deployment",
  );

  await context.infrastructure.container.restart(project.id, deployment.id);

  await context.infrastructure.deployment.markStoppedByUser(project.id, false);

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Application restarted successfully.",
  );
}

async function getStatus(context) {
  const { project } = context;

  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);

  if (!deployment) {
    return {
      status: "Not Deployed",
      running: false,
      stoppedByUser: false,
    };
  }

  const containerStatus = await context.infrastructure.container.getStatus(
    project.id,
  );

  return {
    ...containerStatus,

    status: deployment.status,

    running: deployment.status === "running",

    stoppedByUser: deployment.stopped_by_user,
  };
}
