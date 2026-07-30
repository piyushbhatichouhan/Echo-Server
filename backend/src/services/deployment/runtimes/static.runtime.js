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

  context.outputDirectory = path.resolve(
    context.cwd,
    settings.output_directory || ".",
  );

  context.publishedDirectory =
    context.infrastructure.publisher.getPublishedDirectory(project.id);
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
  const { outputDirectory, publishedDirectory, deployment, settings } = context;

  await context.infrastructure.logger.stage(deployment.id, "Publishing Files");

  //
  // Ensure output directory exists
  //
  try {
    await fs.access(outputDirectory);
  } catch {
    throw new Error(
      `Output directory "${settings.output_directory}" was not found.`,
    );
  }

  //
  // Copy files
  //
  await context.infrastructure.logger.info(
    deployment.id,
    "Copying build output...",
  );

  await context.infrastructure.publisher.copyDirectory(
    outputDirectory,
    publishedDirectory,
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Files copied successfully.",
  );

  //
  // Generate nginx config
  //
  await context.infrastructure.logger.info(
    deployment.id,
    "Generating web server configuration...",
  );

  await context.infrastructure.nginx.publishStaticSite(context);

  await context.infrastructure.logger.info(
    deployment.id,
    "Web server configuration generated.",
  );
}

async function verify(context) {
  const { deployment, publishedDirectory } = context;

  await context.infrastructure.logger.stage(
    deployment.id,
    "Verifying Deployment",
  );

  await context.infrastructure.verification.verifyStaticDeployment(
    publishedDirectory,
  );

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

async function cleanup(context) {}

async function start(context) {
  const deployment =
    await context.infrastructure.deployment.getLatestDeployment(
      context.project.id,
    );

  if (!deployment) {
    throw new Error("No deployment found.");
  }

  await context.infrastructure.logger.stage(
    deployment.id,
    "Starting Deployment",
  );

  await context.infrastructure.deployment.updateStatus(
    deployment.id,
    "running",
  );

  await context.infrastructure.logger.info(
    deployment.id,
    "Static site is now online.",
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
      status: "Not Deployed",
      running: false,
      stoppedByUser: false,
    };
  }

  return {
    status: deployment.status,
    running: deployment.status === "running",
    stoppedByUser: deployment.stopped_by_user,
  };
}
