const applicationService = require("./application.service");
const environmentService = require("./environment.service");
const projectService = require("./project.service");
const verifyProjectOwnership = (projectId, ownerId) =>
  projectService.verifyProjectOwnership(projectId, ownerId);
const { getRuntime } = require("../runtime");
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

const os = require("os");
const { addServerLog } = require("./serverLog.service");

const assertHostCapacity = async () => {
  const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
  const minMemMB = Number(process.env.MIN_FREE_MEMORY_MB) || 250;
  if (freeMemMB < minMemMB) {
    const errorMsg = `Deployment blocked: Host physical memory is critically low (${freeMemMB}MB free, minimum safe threshold: ${minMemMB}MB). Circuit breaker armed to prevent server crash.`;
    addServerLog({
      level: "warn",
      source: "deployment",
      message: errorMsg,
    });
    const err = new Error(errorMsg);
    err.status = 503;
    throw err;
  }

  try {
    const checkDiskSpace = require("check-disk-space").default;
    const disk = await checkDiskSpace(process.cwd());
    const freeDiskGB = Number((disk.free / (1024 * 1024 * 1024)).toFixed(2));
    const minDiskGB = Number(process.env.MIN_FREE_DISK_GB) || 2.5;
    if (freeDiskGB < minDiskGB) {
      const errorMsg = `Deployment blocked: Host storage drive has critically low free space (${freeDiskGB}GB free, minimum safe threshold: ${minDiskGB}GB). Circuit breaker armed to prevent filesystem freeze.`;
      addServerLog({
        level: "warn",
        source: "deployment",
        message: errorMsg,
      });
      const err = new Error(errorMsg);
      err.status = 507;
      throw err;
    }
  } catch (err) {
    if (err.status) throw err;
  }
};

const assertUserResourceAllowance = async (ownerId, projectId) => {
  const { pool } = require("../config/database");
  const userRes = await pool.query(
    "SELECT id, is_owner, COALESCE(ram_limit_mb, 512) AS ram_limit_mb, COALESCE(max_active_projects, 2) AS max_active_projects FROM users WHERE id = $1",
    [ownerId],
  );
  const user = userRes.rows[0];
  if (!user || user.is_owner) return; // Superadmin / Owner accounts are unconstrained

  // Query all user's projects and their latest deployment status
  const projectsRes = await pool.query(
    `
    SELECT p.id, COALESCE(d.status, 'Not Deployed') AS status
    FROM projects p
    LEFT JOIN LATERAL (
      SELECT status FROM deployments WHERE project_id = p.id ORDER BY CASE WHEN status = 'running' THEN 0 ELSE 1 END, updated_at DESC, created_at DESC LIMIT 1
    ) d ON TRUE
    WHERE p.owner_id = $1
    `,
    [ownerId],
  );

  // Other currently running projects (excluding current project being started/redeployed)
  const otherRunning = projectsRes.rows.filter(
    (p) =>
      String(p.id) !== String(projectId) &&
      (p.status || "").toLowerCase() === "running",
  );

  // 1. Check active projects cap
  if (otherRunning.length + 1 > user.max_active_projects) {
    const errorMsg = `Active projects limit reached (${otherRunning.length}/${user.max_active_projects} running). Please stop an existing running project before launching this one.`;
    const err = new Error(errorMsg);
    err.status = 403;
    err.isUserError = true;
    throw err;
  }

  // 2. Check RAM allowance (256 MB per container allocation)
  const containerService = require("./container.service");
  const limits = containerService.getContainerResourceLimits();
  const perContainerMB = limits.maxMemoryMB || 256;
  const currentAllocatedMB = otherRunning.length * perContainerMB;

  if (currentAllocatedMB + perContainerMB > user.ram_limit_mb) {
    const errorMsg = `RAM allowance exceeded. Launching this project requires ${perContainerMB}MB RAM (${currentAllocatedMB}MB currently used across running projects of ${user.ram_limit_mb}MB allowed). Please stop an unused running project or contact superadmin to increase your RAM limit.`;
    const err = new Error(errorMsg);
    err.status = 403;
    err.isUserError = true;
    throw err;
  }
};

const deployProject = async (projectId, ownerId, gitMeta = {}) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  // Pre-flight circuit breaker: verify host RAM and disk before building
  await assertHostCapacity();
  await assertUserResourceAllowance(ownerId, projectId);

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

  // Pre-flight check: validate directories, scripts, and commands before building
  const { validatePreflight } = require("./deployment/preflightValidator.service");
  const preflight = await validatePreflight(projectId, settings, userEnvironment);

  const deploymentContext = buildExecutionContext(
    project,
    settings,
    userEnvironment,
  );
  deploymentContext.preflightWarnings = preflight.warnings;
  if (gitMeta && typeof gitMeta === "object") {
    deploymentContext.gitMeta = gitMeta;
  }

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

  const result = await runtime.stop(context);
  return result || { success: true, message: "Project stopped successfully" };
};

const startProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);
  await assertHostCapacity();
  await assertUserResourceAllowance(ownerId, projectId);

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

  const result = await runtime.start(context);

  // Explicitly ensure deployment status is marked running in database
  const latestDeployment =
    context.deployment ||
    (await deploymentRepository.getLatestDeployment(projectId));
  if (latestDeployment) {
    await deploymentRepository.updateStatus(latestDeployment.id, "running");
    await deploymentRepository.markStoppedByUser(projectId, false);
  }

  // Refresh routing only if this project is already published
  try {
    await publicationService.republishProject(projectId, ownerId);
  } catch (err) {
    console.warn(
      `[DeploymentService] Warning republishing project ${projectId} on start:`,
      err.message,
    );
  }

  return result;
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

  const result = await runtime.restart(context);

  // Refresh routing only if this project is already published
  try {
    await publicationService.republishProject(projectId, ownerId);
  } catch (err) {
    console.warn(
      `[DeploymentService] Warning republishing project ${projectId} on restart:`,
      err.message,
    );
  }

  return result;
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
  await assertHostCapacity();
  await assertUserResourceAllowance(ownerId, projectId);

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

  // Start container from target deployment's image using Blue-Green switchover
  const containerPort =
    targetDeployment.container_port ||
    Number(settings?.port) ||
    3000;

  const portService = require("./port.service");
  const hostPort = await portService.getAvailablePort(projectId, {
    allowReuse: false,
  });
  await deploymentRepository.updatePort(targetDeployment.id, hostPort);
  targetDeployment.port = hostPort;

  const rbVersion = `rb${Date.now()}`;
  const containerName = container.getContainerName(projectId, rbVersion);

  const newContainer = await container.create(
    projectId,
    targetDeployment.image_name,
    userEnvironment,
    hostPort,
    containerPort,
    containerName,
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
    newContainer.echoName || containerName,
    containerPort,
  );
  await deploymentRepository.markStoppedByUser(projectId, false);

  // Republish if published
  await publicationService.republishProject(projectId, ownerId);

  // Terminate previous containers after successful switchover
  try {
    await container.removePreviousContainers(projectId, newContainer.id);
  } catch {}

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
