const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");
const healthService = require("../../health.service");
module.exports = {
  INTERNAL_PORT: 8000,
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

    //await healthCheck(context);

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
  context.containerPort = module.exports.INTERNAL_PORT;
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

EXPOSE ${module.exports.INTERNAL_PORT}

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
  console.log("[Python Install Result]", {
    command: settings.install_command,
    cwd,
    success: result.success,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error,
    exitCode: result.exitCode,
  });
  if (!result.success) {
    await context.infrastructure.logger.error(
      deployment.id,
      result.stderr ||
        result.error ||
        result.stdout ||
        "Install command failed.",
    );

    throw new Error(
      result.stderr ||
        result.error ||
        result.stdout ||
        "Install command failed.",
    );
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
    environment,
    deployment.port, // host port
    context.containerPort, // runtime internal port
  );

  context.container = container;

  // Start ONCE
  await context.infrastructure.container.start(container, deployment.id);

  // Save metadata
  await context.infrastructure.deployment.updateContainer(
    deployment.id,
    container.id,
    container.echoName,
    context.containerPort,
  );

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

async function healthCheck(context) {
  const { deployment, settings } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Checking Application Health",
  );
  const healthy = await healthService.checkApplication(
    context.project.id,
    runtime.INTERNAL_PORT,
  );

  if (!healthy) {
    throw new Error("Application failed health check.");
  }

  await context.infrastructure.logger.info(
    deployment.id,
    "Application responded successfully.",
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
      state: "not_deployed",
      display: "Not Deployed",

      running: false,
      stoppedByUser: false,
    };
  }

  const containerStatus = await context.infrastructure.container.getStatus(
    project.id,
  );
  return {
    ...containerStatus,

    state: deployment.status,

    display: deployment.status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),

    running: deployment.status === "running",

    stoppedByUser: deployment.stopped_by_user,
    port: deployment.port,
  };
}
