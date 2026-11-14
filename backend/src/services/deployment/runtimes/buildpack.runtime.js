const workspace = require("../../workspace/workspace.service");
const fs = require("fs/promises");
const path = require("path");
const healthService = require("../../health.service");
const { detectBuildpack } = require("../buildpack/buildpack.detector");
const { generateDockerfileForLanguage } = require("../buildpack/dockerfile.generator");

module.exports = {
  INTERNAL_PORT: 8080,
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
    await build(context);
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

async function prepare(context) {
  const { project, settings } = context;

  const baseDir = workspace.getProjectFilesDirectory(project.id);
  const workingDir =
    settings?.working_directory && settings.working_directory !== "."
      ? path.join(baseDir, settings.working_directory)
      : baseDir;
  context.cwd = workingDir;

  // 1. Detect language / framework from workspace files
  const detected = await detectBuildpack(context.cwd);
  context.detectedBuildpack = detected;

  const version = `${Date.now()}`;
  context.version = version;
  context.imageName = `echoserver-buildpack-${project.id}:${version}`;

  // 2. Resolve port priority: User env PORT -> Settings port -> Detected buildpack default -> 8080
  context.containerPort =
    context.resolvedPort ||
    Number(settings?.port) ||
    detected.port ||
    module.exports.INTERNAL_PORT;

  context.containerName = context.infrastructure.container.getContainerName(
    project.id,
    version,
  );

  // 3. Generate Dockerfile if not explicitly provided
  let dockerfile = settings?.dockerfile?.trim();
  if (!dockerfile) {
    dockerfile = generateDockerfileForLanguage(detected.language, {
      port: context.containerPort,
      buildCommand: settings?.build_command || "",
      startCommand: settings?.start_command || "",
    });
  }

  context.settings = {
    ...settings,
    dockerfile,
  };
}

async function createDeployment(context) {
  const { project } = context;

  // Blue/Green: Keep previous deployment running until new container passes health check
  context.deployment = await context.infrastructure.deployment.create(
    project.id,
    context.imageName,
    context.containerName,
    context.gitMeta,
  );

  await context.infrastructure.deployment.updateStatus(
    context.deployment.id,
    "building",
  );

  await context.infrastructure.logger.stage(
    context.deployment.id,
    `Smart Buildpack: Detected ${context.detectedBuildpack?.title || "Language"}`,
  );

  if (context.preflightWarnings?.length > 0) {
    for (const warn of context.preflightWarnings) {
      await context.infrastructure.logger.info(context.deployment.id, warn);
    }
  }
}

async function build(context) {
  const { project, settings, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    `Building Container Image (${context.detectedBuildpack?.language || "buildpack"})`,
  );

  const imageName = await context.infrastructure.docker.build(
    project.id,
    context.settings,
    async (message) => {
      await context.infrastructure.logger.info(deployment.id, message);
    },
    context.version,
  );

  context.imageName = imageName;
  await context.infrastructure.deployment.updateImage(deployment.id, imageName);
  await context.infrastructure.logger.info(
    deployment.id,
    "Buildpack image compiled successfully.",
  );
}

async function verify(context) {
  const { deployment } = context;
  await context.infrastructure.logger.stage(
    deployment.id,
    "Verifying Container Artifacts",
  );
  await context.infrastructure.logger.info(
    deployment.id,
    `Verified production container artifact (${context.imageName}).`,
  );
}

async function start(context) {
  const { project, userEnvironment, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Application Container",
  );

  const environment = [
    ...(userEnvironment || []).map((e) => `${e.key}=${e.value}`),
    `PORT=${context.containerPort}`,
    "NODE_ENV=production",
  ];

  const container = await context.infrastructure.container.create(
    project.id,
    context.imageName,
    environment,
    deployment.port,
    context.containerPort,
    {
      containerName: context.containerName,
      maxCpuPercent: context.settings?.max_cpu_percent,
      maxMemoryMB: context.settings?.max_memory_mb,
      restartPolicy: context.settings?.restart_policy || "unless-stopped",
    },
  );

  context.container = container;
  await context.infrastructure.container.start(container, deployment.id);

  // Record container metadata in database
  await context.infrastructure.deployment.updateContainer(
    deployment.id,
    context.containerName,
    context.containerPort,
  );

  await context.infrastructure.logger.info(
    deployment.id,
    `Container online on host port ${deployment.port} -> container port ${context.containerPort}`,
  );
}

async function healthCheck(context) {
  const { project, deployment } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Performing Health Check & Port Probe",
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

async function finishDeployment(context) {
  const { deployment, project } = context;

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  // Atomically update edge router
  try {
    const publicationService = require("../../../publication/publication.service");
    await publicationService.republishProject(project.id, project.owner_id);
  } catch (err) {
    console.warn("[Buildpack Deployment] Router republish warning:", err.message);
  }

  // Blue/Green: Tear down obsolete previous containers now that new build is healthy
  try {
    await context.infrastructure.container.removePreviousContainers(
      project.id,
      context.container?.id || context.containerName,
    );
  } catch (err) {
    console.warn("[Buildpack Deployment] Cleanup warning:", err.message);
  }

  await context.infrastructure.deployment.stopPreviousDeployments(
    project.id,
    deployment.id,
  );
}

async function failDeployment(context, error) {
  if (context.deployment?.id) {
    await context.infrastructure.deployment.updateStatus(
      context.deployment.id,
      "failed",
    );
    await context.infrastructure.logger.error(
      context.deployment.id,
      error.message || "Deployment failed",
    );
  }
}

async function cleanup(context) {
  if (context.container) {
    try {
      await context.container.stop().catch(() => {});
      await context.container.remove({ force: true }).catch(() => {});
    } catch (_) {}
  }
}

async function stop(context) {
  const { project } = context;
  await context.infrastructure.container.stopByProject(project.id);
  const latestDeployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);
  if (latestDeployment) {
    await context.infrastructure.deployment.updateStatus(latestDeployment.id, "stopped");
    await context.infrastructure.deployment.markStoppedByUser(project.id, true);
  }
  return { success: true, message: "Project stopped" };
}

async function restart(context) {
  const { project, deployment } = context;
  await context.infrastructure.container.restart(project.id, deployment?.id);
  const latestDeployment =
    await context.infrastructure.deployment.getLatestDeployment(project.id);
  if (latestDeployment) {
    await context.infrastructure.deployment.updateStatus(latestDeployment.id, "running");
    await context.infrastructure.deployment.markStoppedByUser(project.id, false);
  }
  return { success: true, message: "Project restarted" };
}

async function getStatus(context) {
  const { project } = context;
  const status = await context.infrastructure.container.getStatus(project.id);
  return {
    state: status.state,
    display: status.display,
  };
}

