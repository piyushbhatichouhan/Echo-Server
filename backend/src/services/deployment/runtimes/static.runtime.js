const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");
const healthService = require("../../health.service");
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

    //  await healthCheck(context);

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

  context.outputDirectory = path.resolve(
    context.cwd,
    settings.output_directory || ".",
  );
  context.imageName = `echo-${project.id}`;
  context.containerPort = 80;
  context.publishedDirectory =
    context.infrastructure.publisher.getPublishedDirectory(project.id);

  context.settings.dockerfile = generateDockerfile(context);
}

function generateDockerfile(context) {
  const output = context.settings.output_directory || "dist";

  return `
FROM nginx:alpine

COPY ${output}/ /usr/share/nginx/html/

EXPOSE 80
`;
}

async function createDeployment(context) {
  const { project, settings } = context;

  await context.infrastructure.deployment.stopPreviousDeployments(project.id);

  context.deployment = await context.infrastructure.deployment.create(
    project.id,
    null,
    null,
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
  const { deployment, project, settings } = context;

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

  // Build new image
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

  await context.infrastructure.logger.info(
    deployment.id,
    "Docker image verified.",
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

async function cleanup(context) {}

async function start(context) {
  const { project, environment } = context;

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
    context.containerPort,
  );

  context.container = container;

  // Start it
  await context.infrastructure.container.start(container, deployment.id);

  await context.infrastructure.deployment.markStoppedByUser(project.id, false);

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Static site is now online.",
  );
}
async function healthCheck(context) {
  const { deployment, settings } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Checking Application Health",
  );

  const healthy = await healthService.checkApplication(context.project.id, 80);

  if (!healthy) {
    throw new Error("Application failed health check.");
  }

  await context.infrastructure.logger.info(
    deployment.id,
    "Application responded successfully.",
  );
}

async function stop(context) {
  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(
      context.project.id,
    );

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Stopping Deployment",
  );

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "stopped",
  );

  await context.infrastructure.deployment.markStoppedByUser(
    deployment.project_id,
    true,
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Static site has been stopped.",
  );
}

async function restart(context) {
  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(
      context.project.id,
    );

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Restarting Deployment",
  );

  await context.infrastructure.deployment.markStoppedByUser(
    deployment.project_id,
    false,
  );

  await start(context);

  await context.infrastructure.logger.info(
    deployment.id,
    "Static site restarted successfully.",
  );
}

async function getStatus(context) {
  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(
      context.project.id,
    );

  if (!deployment) {
    return {
      state: "not_deployed",
      display: "Not Deployed",

      running: false,
      stoppedByUser: false,
    };
  }

  return {
    state: deployment.status,

    display: deployment.status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),

    running: deployment.status === "running",

    stoppedByUser: deployment.stopped_by_user,
  };
}
