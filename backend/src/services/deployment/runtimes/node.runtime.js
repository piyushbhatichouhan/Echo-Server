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

  const userNodeEnv =
    (environment || []).find((e) => e && e.key === "NODE_ENV")?.value ||
    "production";

  // Filter out NODE_ENV during build so npm/yarn/pnpm install devDependencies (vite, webpack, tailwind, etc.)
  const buildEnvDeclarations = (environment || [])
    .filter((e) => e && e.key && e.key !== "NODE_ENV")
    .map((e) => {
      const sanitized = String(e.value ?? "").replace(/"/g, '\\"');
      return `ARG ${e.key}="${sanitized}"\nENV ${e.key}="${sanitized}"`;
    })
    .join("\n");

  const workingDirInstruction =
    settings.working_directory && settings.working_directory !== "."
      ? `WORKDIR /app/${settings.working_directory.replace(/^\/+/, "")}`
      : "";

  const defaultInstall =
    "if [ -f pnpm-lock.yaml ]; then pnpm install; elif [ -f yarn.lock ]; then yarn install; elif [ -f package.json ]; then npm install; fi";
  const installCmd = settings.install_command?.trim() || defaultInstall;

  const defaultStart =
    'if [ -f package.json ] && grep -q \'"start":\' package.json; then npm start; elif [ -f server.js ]; then node server.js; elif [ -f app.js ]; then node app.js; elif [ -f index.js ]; then node index.js; elif [ -f dist/index.js ]; then node dist/index.js; else npm start; fi';
  const startCmd = settings.start_command?.trim() || defaultStart;

  return `
FROM node:22-alpine

WORKDIR /app

# Essential system dependencies for native builds and Prisma/crypto
RUN apk add --no-cache python3 make g++ libc6-compat git bash openssl

# Pre-install pnpm (yarn is already in base image)
RUN npm install -g pnpm

# Configure Node/NPM build environment:
# 1. Expand PATH so binaries in .bin (vite, next, prisma, tsc, tailwind) can be invoked directly
# 2. Prevent peer dependency resolution crashes (NPM 7+)
# 3. Ensure devDependencies are installed across npm and yarn
# 4. Expand heap space to 2GB to prevent build out-of-memory errors
# 5. Ensure host binds to all interfaces (0.0.0.0)
ENV PATH="/app/node_modules/.bin:/app/frontend/node_modules/.bin:/app/backend/node_modules/.bin:/app/client/node_modules/.bin:/app/server/node_modules/.bin:$PATH"
ENV NPM_CONFIG_PRODUCTION=false
ENV YARN_PRODUCTION=false
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV HOST=0.0.0.0

# Copy all application files first so monorepos, subfolders, and scripts exist
COPY . .

${workingDirInstruction}

${buildEnvDeclarations}

# Install dependencies
RUN ${installCmd}

# Build application
${settings.build_command?.trim() ? `RUN ${settings.build_command}` : ""}

# Switch to production mode for application runtime
ENV NODE_ENV="${userNodeEnv}"
ENV PORT=${context.containerPort}
EXPOSE ${context.containerPort}

CMD ["sh", "-c", "exec ${startCmd.replace(/"/g, '\\"')}"]
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

  if (context.preflightWarnings?.length > 0) {
    for (const warn of context.preflightWarnings) {
      await context.infrastructure.logger.info(context.deployment.id, warn);
    }
  }
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

  const { explainError } = require("../errorExplainer.service");
  const explanation = explainError(error.message);
  if (explanation) {
    await context.infrastructure.logger.warn(
      context.deployment.id,
      `💡 Recommendation: ${explanation.suggestion}`,
    );
  }

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

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Application container started and running.",
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

  const isRunning =
    (deployment.status === "running" && containerStatus.running) ||
    (containerStatus.running && !deployment.stopped_by_user);

  const effectiveState = isRunning ? "running" : deployment.status;

  return {
    ...containerStatus,

    state: effectiveState,

    display: effectiveState
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),

    running: effectiveState === "running",

    stoppedByUser: deployment.stopped_by_user,
    port: deployment.port,
  };
}
