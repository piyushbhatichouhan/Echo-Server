const applicationService = require("./application.service");
const environmentService = require("./environment.service");
const { verifyProjectOwnership } = require("./project.service");
const { getRuntime } = require("../runtime");
const projectService = require("./project.service");
const workspaceService = require("./workspace.service");
const path = require("path");
const fs = require("fs/promises");
const { pool } = require("../config/database");
const runtimeResolver = require("./deployment/runtimeResolver");
const projectSettingsService = require("./projectSettings.service");
const deploymentRepository = require("./deployment/infrastructure/deployment.infrastructure");
const infrastructure = require("./deployment/infrastructure");
const runtimeEnvironmentService = require("./runtime.environment.service");
const publicationService = require("../publication/publication.service");
const {
  deployment,
  logger,
  docker,
  container,
  git,
  publisher,
  nginx,
  verification,
  process: processInfrastructure,
} = infrastructure;

const buildExecutionContext = (project, settings, userEnvironment = []) => {
  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  // Dynamic port resolution: User env PORT -> Settings port -> Runtime default
  let resolvedPort = runtime.INTERNAL_PORT;
  if (settings.runtime !== "static") {
    const userPort = userEnvironment.find((e) => e.key === "PORT")?.value;
    if (userPort && !isNaN(Number(userPort)) && Number(userPort) > 0) {
      resolvedPort = Number(userPort);
    } else if (
      settings?.port &&
      !isNaN(Number(settings.port)) &&
      Number(settings.port) > 0
    ) {
      resolvedPort = Number(settings.port);
    }
  }

  const runtimeEnvironment = runtimeEnvironmentService.buildRuntimeEnvironment(
    project,
    settings,
    resolvedPort,
  );

  // Merge runtime defaults, user overrides, enforce resolved PORT
  const envMap = new Map();
  for (const item of runtimeEnvironment) {
    if (item?.key) envMap.set(item.key, String(item.value ?? ""));
  }
  for (const item of userEnvironment) {
    if (item?.key) envMap.set(item.key, String(item.value ?? ""));
  }
  envMap.set("PORT", resolvedPort.toString());

  const environment = Array.from(envMap.entries()).map(([key, value]) => ({
    key,
    value,
  }));

  return {
    project,
    settings,
    environment,
    resolvedPort,
    infrastructure,
  };
};

const deployProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const repository = await git.getRepository(projectId, ownerId);

  if (repository) {
    await git.updateRepository(projectId, ownerId);
  }

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const userEnvironment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const deploymentContext = buildExecutionContext(
    project,
    settings,
    userEnvironment,
  );

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const deployment = await runtime.deploy(deploymentContext);

  // Refresh routing only if this project is already published
  await publicationService.republishProject(projectId, ownerId);

  return deployment;
};

const stopProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const userEnvironment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const context = buildExecutionContext(project, settings, userEnvironment);

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  return await runtime.stop(context);
};

const startProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const userEnvironment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const context = buildExecutionContext(project, settings, userEnvironment);

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  return await runtime.start(context);
};

const restartProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const userEnvironment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const context = buildExecutionContext(project, settings, userEnvironment);

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  return await runtime.restart(context);
};

const getProjectDeployments = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return await deploymentRepository.getProjectDeployments(projectId);
};

const getDeploymentStatus = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  // Nothing has ever been deployed
  if (!settings) {
    return {
      state: "not_deployed",
      display: "Not Deployed",
      running: false,
      stoppedByUser: false,
    };
  }

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const runtimeStatus = await runtime.getStatus({
    projectId,
    project: await projectService.getProjectById(projectId, ownerId),
    settings,
    infrastructure,
  });

  const repository = await git.getRepository(projectId, ownerId);

  return {
    ...runtimeStatus,

    state: runtimeStatus.state,
    display: runtimeStatus.display,

    runtime: settings.runtime,

    workingDirectory: settings.working_directory,

    repository: repository?.repository_name ?? null,
    branch: repository?.branch ?? null,
  };
};

const redeployProject = async (projectId, ownerId) => {
  return await deployProject(projectId, ownerId);
};

const createDeploymentProject = async (projectId, ownerId) => {
  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const workspaceRoot = workspaceService.getProjectFilesDirectory(projectId);

  const workspace = path.resolve(
    workspaceRoot,
    settings.working_directory || ".",
  );

  try {
    await fs.access(workspace);
  } catch {
    throw new Error(
      `Working directory "${settings.working_directory}" does not exist.`,
    );
  }

  return {
    projectId,
    workspace,
    runtime: settings.runtime,
    install_command: settings.install_command,
    build_command: settings.build_command,
    start_command: settings.start_command,
    working_directory: settings.working_directory,

    environment: process.env,
  };
};

const deploy = async (projectId, ownerId) => {
  try {
    await projectService.verifyProjectOwnership(projectId, ownerId);

    const project = await createDeploymentProject(projectId, ownerId);

    const runtime = getRuntime(project.runtime);

    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='building',
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId],
    );

    await runtime.install(project);

    await runtime.build(project);

    const process = await runtime.start(projectId, project);

    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='running',
          process_id=$2,
          runtime_directory=$3,
          started_at=NOW(),
          last_deployed_at=NOW(),
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId, process.pid, project.workspace],
    );

    return {
      running: true,
      pid: process.pid,
    };
  } catch (error) {
    await pool.query(
      `
      UPDATE project_deployments
      SET
          status='failed',
          updated_at=NOW()
      WHERE project_id=$1
      `,
      [projectId],
    );

    throw error;
  }
};

const rollbackDeployment = async (projectId, ownerId, targetDeploymentId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const targetDeployment =
    await deploymentRepository.getDeploymentById(targetDeploymentId);
  if (!targetDeployment || targetDeployment.project_id !== projectId) {
    throw new Error("Target deployment not found for this project.");
  }
  if (!targetDeployment.image_name) {
    throw new Error("Target deployment does not have a valid container image to rollback to.");
  }

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );
  const userEnvironment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  // Stop previous running container
  await container.stopByProject(projectId);
  await container.removeByProject(projectId);

  // Start container from target deployment's image
  const containerPort =
    targetDeployment.container_port ||
    Number(settings?.port) ||
    3000;

  const newContainer = await container.create(
    projectId,
    targetDeployment.image_name,
    userEnvironment,
    targetDeployment.port,
    containerPort,
  );

  await container.start(newContainer, targetDeployment.id);

  // Mark all previous deployments stopped except the rolled back one
  await deploymentRepository.stopPreviousDeployments(
    projectId,
    targetDeployment.id,
  );
  await deploymentRepository.updateStatus(targetDeployment.id, "running");
  await deploymentRepository.updateContainer(
    targetDeployment.id,
    newContainer.id,
    newContainer.echoName,
    containerPort,
  );
  await deploymentRepository.markStoppedByUser(projectId, false);

  // Republish if published
  await publicationService.republishProject(projectId, ownerId);

  return targetDeployment;
};

module.exports = {
  deployProject,
  getProjectDeployments,
  getDeploymentStatus,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
  rollbackDeployment,
  deploy,
};
