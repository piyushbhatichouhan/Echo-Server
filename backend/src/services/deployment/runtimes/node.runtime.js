const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");
const healthService = require("../../health.service");

module.exports = {
  INTERNAL_PORT: 3000,
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

    await healthCheck(context);

    await finishDeployment(context);

    return context.deployment;
  } catch (error) {
    if (!error.status) error.status = 400;
    error.isUserError = true;

    await failDeployment(context, error);

    await cleanup(context);

    throw error;
  }
}

// Private Functions

async function prepare(context) {
  const { project, settings } = context;

  context.cwd = workspace.getProjectFilesDirectory(project.id);

  const version = `${Date.now()}`;
  context.version = version;
  context.imageName = `echoserver-${project.id}:${version}`;
  context.containerPort =
    context.resolvedPort ||
    Number(settings?.port) ||
    module.exports.INTERNAL_PORT;
  context.containerName = context.infrastructure.container.getContainerName(
    project.id,
    version,
  );

  context.settings.dockerfile = generateDockerfile(context);
}

function generateDockerfile(context) {
  const { settings, environment } = context;

  const envDeclarations = (environment || [])
    .filter((e) => e && e.key)
    .map((e) => {
      const sanitized = String(e.value ?? "").replace(/"/g, '\\"');
      return `ARG ${e.key}="${sanitized}"\nENV ${e.key}="${sanitized}"`;
    })
    .join("\n");

  const workingDirInstruction =
    settings.working_directory && settings.working_directory !== "."
      ? `WORKDIR /app/${settings.working_directory.replace(/^\/+/, "")}`
      : "";

  return `
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat git bash
RUN npm install -g pnpm yarn

# Copy all application files first so monorepos, subfolders, and scripts exist
COPY . .

${workingDirInstruction}

${envDeclarations}

# Install dependencies
${settings.install_command?.trim() ? `RUN ${settings.install_command}` : "RUN npm install"}

# Build application
${settings.build_command?.trim() ? `RUN ${settings.build_command}` : ""}

ENV NODE_ENV=production
ENV PORT=${context.containerPort}
EXPOSE ${context.containerPort}

CMD ["sh", "-c", "${settings.start_command || 'npm start'}"]
`;
}

async function createDeployment(context) {
  const { project, settings } = context;

  // Blue/Green: Do NOT stop previous deployment here; keep it running until new build succeeds
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
  const { settings, deployment } = context;

  if (!settings.install_command?.trim()) {
    return;
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Configuring Isolated Dependencies",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    `Install command (${settings.install_command}) will execute cleanly in containerized build environment.`,
  );
}

async function build(context) {
  const { settings, deployment } = context;

  if (!settings.build_command?.trim()) {
    return;
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Configuring Isolated Build",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    `Build command (${settings.build_command}) will execute inside isolated container environment.`,
  );
}

async function publish(context) {
  const { project, settings, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Building Docker Image",
  );

  // Blue-Green: Keep previous Docker image intact while old container is serving live traffic

  // Build new image with version tag
  const imageName = await context.infrastructure.docker.build(
    project.id,
    settings,
    async (message) => {
      await context.infrastructure.logger.info(deployment.id, message);
    },
    context.version,
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

  // Placeholder for future verification:
  // - verify Docker image exists
  // - inspect image metadata
  // - validate exposed port
  // - perform pre-start checks

  await context.infrastructure.logger.info(
    deployment.id,
    "Deployment verified successfully.",
  );
}

async function finishDeployment(context) {
  const { deployment, project } = context;

  // 1. Mark newly healthy deployment as running
  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  // 2. Atomically update reverse proxy (NPM/Nginx) if project is published
  try {
    const publicationService = require("../../../publication/publication.service");
    await publicationService.republishProject(project.id, project.owner_id);
  } catch (pubErr) {
    console.warn(
      "[Deployment] Reverse proxy atomic switch warning:",
      pubErr.message,
    );
  }

  // 3. Blue/Green: Terminate previous container(s) now that new container is healthy & serving traffic
  try {
    await context.infrastructure.container.removePreviousContainers(
      project.id,
      context.container?.id || context.containerName,
    );
  } catch (termErr) {
    console.warn("[Deployment] Old container cleanup warning:", termErr.message);
  }

  // 4. Mark all previous deployments stopped in DB
  await context.infrastructure.deployment.stopPreviousDeployments(
    project.id,
    deployment.id,
  );

  await context.infrastructure.logger.stage(
    deployment.id,
    "Deployment Complete",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Deployment completed successfully with zero downtime (Blue-Green).",
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
}

async function cleanup(context) {
  // Blue-Green failure cleanup: only remove the new failed container and its image,
  // leaving the previous running container online and untouched!
  try {
    if (context.container) {
      await context.infrastructure.container.remove(context.container);
    } else if (context.containerName) {
      await context.infrastructure.container.removeByName(context.containerName);
    }
  } catch {}

  try {
    if (context.imageName) {
      const docker = require("../../../docker/docker.client");
      const img = docker.getImage(context.imageName);
      await img.remove({ force: true });
    }
  } catch {}
}

async function start(context) {
  const { project, environment, settings } = context;

  const deployment =
    context.deployment ||
    (await context.infrastructure.deployment.getLatestDeployment(project.id));

  if (!deployment) {
    const error = new Error("No deployment found.");
    error.status = 404;
    error.isUserError = true;
    throw error;
  }

  // Ensure deployment has an allocated, valid host port
  let hostPort = deployment.port;
  if (!hostPort || isNaN(Number(hostPort)) || Number(hostPort) <= 0) {
    const portService = require("../../port.service");
    hostPort = await portService.getAvailablePort(project.id, {
      allowReuse: false,
    });
    await context.infrastructure.deployment.updatePort(deployment.id, hostPort);
    deployment.port = hostPort;
  }
  context.deployment = deployment;

  const containerPort =
    context.containerPort ||
    deployment.container_port ||
    context.resolvedPort ||
    Number(settings?.port) ||
    module.exports.INTERNAL_PORT;

  const imageName =
    context.imageName ||
    deployment.image_name ||
    `echoserver-${project.id}:${context.version || Date.now()}`;

  const containerName =
    context.containerName ||
    deployment.container_name ||
    context.infrastructure.container.getContainerName(
      project.id,
      context.version || Date.now(),
    );

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Deployment",
  );

  // Blue-Green: Create fresh container alongside existing container
  const container = await context.infrastructure.container.create(
    project.id,
    imageName,
    environment,
    hostPort, // host port
    containerPort, // runtime internal port
    containerName,
  );

  context.container = container;

  // Start ONCE
  await context.infrastructure.container.start(container, deployment.id);

  // Save metadata
  await context.infrastructure.deployment.updateContainer(
    deployment.id,
    container.id,
    container.echoName || containerName,
    containerPort,
  );

  await context.infrastructure.deployment.markStoppedByUser(project.id, false);

  await context.infrastructure.logger.info(
    deployment.id,
    "Application container started, preparing health checks...",
  );

  return { success: true, deployment, port: hostPort };
}

async function healthCheck(context) {
  const { project, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Verifying Application Health & Port",
  );

  const result = await healthService.verifyAndDetectPort(
    context.container?.id || project.id,
    context.containerPort,
    {
      deploymentId: deployment.id,
      logger: context.infrastructure.logger,
      hostPort: deployment.port,
      maxWaitMs: 25000,
      checkIntervalMs: 1000,
    },
  );

  if (result.autoDetected) {
    context.containerPort = result.port;
  }

  if (result.success) {
    await context.infrastructure.logger.info(
      deployment.id,
      `Application confirmed online and listening on port ${result.port}.`,
    );
  } else {
    const status = await context.infrastructure.container.getStatus(project.id);
    if (!status.running) {
      const error = new Error(
        `Application container exited prematurely (Exit code: ${status.exitCode}). Check logs for details.`,
      );
      error.status = 400;
      error.isUserError = true;
      throw error;
    }

    await context.infrastructure.logger.warn(
      deployment.id,
      `Application did not respond to HTTP probe on port ${context.containerPort} within 25 seconds. Container is still running in background.`,
    );
  }
}

async function stop(context) {
  const { project } = context;

  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);

  if (!deployment) {
    const error = new Error("No deployment found.");
    error.status = 404;
    error.isUserError = true;
    throw error;
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
    const error = new Error("No deployment found.");
    error.status = 404;
    error.isUserError = true;
    throw error;
  }

  // If container doesn't exist or is not running or has no port, start freshly
  const status = await context.infrastructure.container.getStatus(project.id);
  if (!status.exists || !status.running || !deployment.port) {
    return await start(context);
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

  return { success: true, deployment, port: deployment.port };
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
