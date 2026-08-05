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

  const runtimeEnvironment = runtimeEnvironmentService.buildRuntimeEnvironment(
    project,
    settings,
  );

  const environment = [...userEnvironment, ...runtimeEnvironment];

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const deploymentContext = {
    project,
    settings,
    environment,
    infrastructure,
  };

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

  const environment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const context = {
    project,
    settings,
    environment,
    infrastructure,
  };

  return await runtime.stop(context);
};

const startProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const environment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const context = {
    project,
    settings,
    environment,
    infrastructure,
  };

  return await runtime.start(context);
};

const restartProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const project = await projectService.getProjectById(projectId, ownerId);

  const settings = await projectSettingsService.getProjectSettings(
    projectId,
    ownerId,
  );

  const environment = await environmentService.getEnvironmentVariables(
    projectId,
    ownerId,
  );

  const runtime = runtimeResolver.getRuntimeHandler(settings.runtime);

  const context = {
    project,
    settings,
    environment,
    infrastructure,
  };

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
    port: settings.port,
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
    port: settings.port,
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

module.exports = {
  deployProject,
  getProjectDeployments,
  getDeploymentStatus,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
  deploy,
};
