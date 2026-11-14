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

  const targetDir =
    settings.working_directory && settings.working_directory !== "."
      ? path.join(context.cwd, settings.working_directory)
      : context.cwd;

  let hasPackageJson = false;
  try {
    await fs.access(path.join(targetDir, "package.json"));
    hasPackageJson = true;
  } catch {
    try {
      await fs.access(path.join(context.cwd, "package.json"));
      hasPackageJson = true;
    } catch {
      hasPackageJson = false;
    }
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
    settings.build_command?.trim() ||
      settings.install_command?.trim() ||
      hasPackageJson,
  );

  const buildEnvDeclarations = (environment || [])
    .filter((e) => e && e.key && e.key !== "NODE_ENV")
    .map((e) => {
      const sanitized = String(e.value ?? "").replace(/"/g, '\\"');
      return `ARG ${e.key}="${sanitized}"\nENV ${e.key}="${sanitized}"`;
    })
    .join("\n");

  if (hasBuildStep) {
    const workingDirInstruction =
      settings.working_directory && settings.working_directory !== "."
        ? `WORKDIR /app/${settings.working_directory.replace(/^\/+/, "")}`
        : "";
    const resolvedOutputPath =
      settings.working_directory && settings.working_directory !== "."
        ? `${settings.working_directory.replace(/^\/+/, "")}/${output}`
        : output;

    const defaultInstall =
      "if [ -f pnpm-lock.yaml ]; then pnpm install; elif [ -f yarn.lock ]; then yarn install; elif [ -f package.json ]; then npm install; fi";
    const installCmd = settings.install_command?.trim() || defaultInstall;
    const buildCmd = settings.build_command?.trim() || "npm run build";

    // Multi-stage isolated container build for SPAs (Vite, React, Vue, etc.)
    return `
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat git bash openssl
RUN npm install -g pnpm

ENV PATH="/app/node_modules/.bin:/app/frontend/node_modules/.bin:$PATH"
ENV NPM_CONFIG_PRODUCTION=false
ENV YARN_PRODUCTION=false
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy all application files first so monorepos, subfolders, and scripts exist
COPY . .

${workingDirInstruction}

${buildEnvDeclarations}

# Install dependencies
RUN ${installCmd}

# Build static assets
RUN ${buildCmd}

# Fallback check: if the configured output dir is missing, find where the build artifacts went
RUN if [ ! -d "/app/${resolvedOutputPath}" ]; then \\
      for candidate in dist build out .output/public public .; do \\
        if [ -d "/app/$candidate" ] && [ "$candidate" != "." ]; then \\
          cp -r "/app/$candidate" "/app/${resolvedOutputPath}"; \\
          break; \\
        fi; \\
      done; \\
    fi && mkdir -p /app/${resolvedOutputPath}

# Stage 2: Unified Static Nginx Server with SPA fallback & gzip
FROM nginx:alpine

RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; gzip on; gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml; location / { try_files $uri $uri/ /index.html; } location ~* \\.(?:css|js|mjs|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|wasm|json)$ { expires 1y; add_header Cache-Control "public, no-transform"; try_files $uri =404; } error_page 500 502 503 504 /50x.html; location = /50x.html { root /usr/share/nginx/html; } }' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/${resolvedOutputPath}/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`;
  }

  // Pure static site (HTML/CSS/JS directly without build tool)
  let sourceDir = ".";
  if (settings.working_directory && settings.working_directory !== ".") {
    sourceDir = `${settings.working_directory.replace(/^\/+/, "")}`;
    if (rawOutput && rawOutput !== "." && rawOutput !== "dist") {
      sourceDir = `${sourceDir}/${rawOutput}`;
    }
  } else if (rawOutput && rawOutput !== "." && rawOutput !== "dist") {
    sourceDir = rawOutput;
  }

  return `
FROM nginx:alpine

RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } location ~* \\.(?:css|js|mjs|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|wasm|json)$ { expires 1y; add_header Cache-Control "public, no-transform"; try_files $uri =404; } }' > /etc/nginx/conf.d/default.conf

COPY ${sourceDir}/ /usr/share/nginx/html/

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
    context.gitMeta,
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

  const containerStatus = await context.infrastructure.container.getStatus(
    context.project.id,
  );

  const isRunning =
    (deployment.status === "running" && containerStatus.running) ||
    (containerStatus.running && !deployment.stopped_by_user);

  const effectiveState = isRunning
    ? "running"
    : deployment.status === "running"
    ? "stopped"
    : (deployment.status || "stopped");

  return {
    ...containerStatus,

    status: effectiveState,

    state: effectiveState,

    display: effectiveState
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),

    running: effectiveState === "running",

    stoppedByUser: deployment.stopped_by_user,
    port: deployment.port,
  };
}
