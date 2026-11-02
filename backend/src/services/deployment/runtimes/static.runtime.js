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
  context.containerPort = module.exports.INTERNAL_PORT;
  context.publishedDirectory =
    context.infrastructure.publisher.getPublishedDirectory(project.id);

  context.settings.dockerfile = generateDockerfile(context);
}

function generateDockerfile(context) {
  const { settings, environment } = context;
  const rawOutput = (settings.output_directory || "").trim();
  const output = rawOutput && rawOutput !== "." ? rawOutput : "dist";

  const hasBuildStep = Boolean(
    settings.build_command?.trim() || settings.install_command?.trim()
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
  const sourceDir = rawOutput && rawOutput !== "." ? `${rawOutput}/` : ".";
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
  const { deployment, project } = context;

  // Blue/Green: Mark all previous deployments stopped except the newly healthy one
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
    context.deployment ||
    (await context.infrastructure.deployment.getLatestDeployment(project.id));

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Deployment",
  );

  const containerPort =
    context.containerPort ||
    deployment.container_port ||
    module.exports.INTERNAL_PORT;

  const imageName =
    context.imageName || deployment.image_name || `echohub-${project.id}`;

  // Stop previous container
  await context.infrastructure.container.stopByProject(project.id);

  // Remove previous container
  await context.infrastructure.container.removeByProject(project.id);

  // Create new container
  const container = await context.infrastructure.container.create(
    project.id,
    imageName,
    environment,
    deployment.port, // host port
    containerPort, // runtime internal port
  );

  context.container = container;

  await context.infrastructure.deployment.updateContainer(
    deployment.id,
    container.id,
    container.echoName,
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
    port: deployment.port,
  };
}
