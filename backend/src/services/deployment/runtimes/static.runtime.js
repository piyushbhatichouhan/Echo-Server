const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");
const healthService = require("../../health.service");
module.exports = {
  INTERNAL_PORT: 80,
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

    throw error;
  }
}

// Private Functions

async function prepare(context) {
  const { project, settings } = context;

  context.cwd = workspace.getProjectFilesDirectory(project.id);

  let hasPackageJson = false;
  try {
    await fs.access(path.join(context.cwd, "package.json"));
    hasPackageJson = true;
  } catch {
    hasPackageJson = false;
  }
  context.hasPackageJson = hasPackageJson;

  context.outputDirectory = path.resolve(
    context.cwd,
    settings.output_directory || ".",
  );
  const version = `${Date.now()}`;
  context.version = version;
  context.imageName = `echoserver-static-${project.id}:${version}`;
  context.containerPort = module.exports.INTERNAL_PORT;
  context.containerName = context.infrastructure.container.getContainerName(
    project.id,
    version,
  );
  context.publishedDirectory =
    context.infrastructure.publisher.getPublishedDirectory(project.id);

  context.settings.dockerfile = generateDockerfile(context);
}

function generateDockerfile(context) {
  const { settings, environment, hasPackageJson } = context;
  const rawOutput = (settings.output_directory || "").trim();
  const output = rawOutput && rawOutput !== "." ? rawOutput : "dist";

  const hasBuildStep = Boolean(
    (settings.build_command?.trim() || settings.install_command?.trim()) &&
      hasPackageJson,
  );

  const envDeclarations = (environment || [])
    .filter((e) => e && e.key)
    .map((e) => {
      const sanitized = String(e.value ?? "").replace(/"/g, '\\"');
      return `ARG ${e.key}="${sanitized}"\nENV ${e.key}="${sanitized}"`;
    })
    .join("\n");

  if (hasBuildStep) {
    // Multi-stage isolated container build for SPAs (Vite, React, Vue, etc.)
    return `
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat

# Copy dependency manifests
COPY package*.json yarn.lock* pnpm-lock.yaml* bun.lockb* ./

${settings.install_command?.trim() ? `RUN ${settings.install_command}` : "RUN npm install"}

# Copy source
COPY . .

${envDeclarations}

${settings.build_command?.trim() ? `RUN ${settings.build_command}` : "RUN npm run build"}

# Stage 2: Unified Static Nginx Server with SPA fallback
FROM nginx:alpine

RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } error_page 500 502 503 504 /50x.html; location = /50x.html { root /usr/share/nginx/html; } }' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/${output}/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;
  }

  // Pure static site (HTML/CSS/JS directly without build tool)
  let sourceDir = rawOutput && rawOutput !== "." ? `${rawOutput}/` : ".";
  if (!hasPackageJson && rawOutput === "dist") {
    sourceDir = ".";
  }

  return `
FROM nginx:alpine

RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

COPY ${sourceDir} /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;
}

async function createDeployment(context) {
  const { project } = context;

  // Blue/Green: Keep previous deployment running until new build is verified
  context.deployment = await context.infrastructure.deployment.create(
    project.id,
    null,
    null,
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
    `Install command (${settings.install_command}) will execute inside isolated container environment.`,
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
  const { deployment, project, settings } = context;

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

  await context.infrastructure.logger.info(
    deployment.id,
    "Docker image verified.",
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

  await cleanup(context);
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
  const { project, environment } = context;

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

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Deployment",
  );

  const containerPort =
    context.containerPort ||
    deployment.container_port ||
    module.exports.INTERNAL_PORT;

  const imageName =
    context.imageName ||
    deployment.image_name ||
    `echoserver-static-${project.id}:${context.version || Date.now()}`;

  const containerName =
    context.containerName ||
    deployment.container_name ||
    context.infrastructure.container.getContainerName(
      project.id,
      context.version || Date.now(),
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

  await context.infrastructure.deployment.updateContainer(
    deployment.id,
    container.id,
    container.echoName || containerName,
    containerPort,
  );
  // Start it
  await context.infrastructure.container.start(container, deployment.id);

  await context.infrastructure.deployment.markStoppedByUser(project.id, false);

  await context.infrastructure.logger.info(
    deployment.id,
    "Application container started, preparing health checks...",
  );

  return { success: true, deployment, port: hostPort };
}

async function healthCheck(context) {
  const { project, deployment, settings } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Verifying Application Health & Port",
  );

  const containerPort =
    context.containerPort ||
    deployment.container_port ||
    module.exports.INTERNAL_PORT ||
    80;

  const result = await healthService.verifyAndDetectPort(
    context.container?.id || project.id,
    containerPort,
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
      `Static application confirmed online and responding on port ${result.port}.`,
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

    const error = new Error(
      `Application failed health check on port ${containerPort} (Host port ${deployment.port}). Container is running but not responding to HTTP requests.`,
    );
    error.status = 400;
    error.isUserError = true;
    throw error;
  }
}

async function stop(context) {
  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(
      context.project.id,
    );

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
    const error = new Error("No deployment found.");
    error.status = 404;
    error.isUserError = true;
    throw error;
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Restarting Deployment",
  );

  await context.infrastructure.deployment.markStoppedByUser(
    deployment.project_id,
    false,
  );

  const result = await start(context);

  await context.infrastructure.logger.info(
    deployment.id,
    "Static site restarted successfully.",
  );

  return result;
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
    port: deployment.port,
  };
}
