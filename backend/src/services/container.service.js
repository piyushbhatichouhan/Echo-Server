const docker = require("../docker/docker.client");

const getContainerName = (projectId) => {
  return `echohub-${projectId}`;
};

const createContainer = async (
  projectId,
  imageName,
  projectPort,
  environment,
) => {
  console.log("container.service loaded");
  const dockerEnvironment = environment.map(
    ({ key, value }) => `${key}=${value}`,
  );

  dockerEnvironment.push("PORT=3000");

  const containerOptions = {
    Image: imageName,

    name: getContainerName(projectId),

    Env: dockerEnvironment,

    ExposedPorts: {
      "3000/tcp": {},
    },

    HostConfig: {
      RestartPolicy: {
        Name: "unless-stopped",
      },

      PortBindings: {
        "3000/tcp": [
          {
            HostPort: String(projectPort),
          },
        ],
      },
    },
  };
  console.log(JSON.stringify(containerOptions, null, 2));
  const container = await docker.createContainer(containerOptions);

  return container;
};

const startContainer = async (container, deploymentId) => {
  await container.start();

  streamContainerLogs(container, deploymentId).catch(console.error);

  return container;
};

const removeContainer = async (container) => {
  await container.remove({
    force: true,
  });
};

const inspectContainer = async (container) => {
  return await container.inspect();
};

const getContainer = (projectId) => {
  return docker.getContainer(getContainerName(projectId));
};

const containerExists = async (projectId) => {
  try {
    await getContainer(projectId).inspect();

    return true;
  } catch {
    return false;
  }
};

const stopContainerByProject = async (projectId) => {
  try {
    const container = getContainer(projectId);
    await container.stop();
  } catch (error) {
    // Ignore if already stopped or doesn't exist
  }
};

const removeContainerByProject = async (projectId) => {
  try {
    const container = getContainer(projectId);

    await container.remove({
      force: true,
    });
  } catch (error) {
    // Ignore if it doesn't exist
  }
};

const getContainerStatus = async (projectId) => {
  try {
    const info = await getContainer(projectId).inspect();

    return {
      exists: true,
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.StartedAt,
      finishedAt:
        info.State.FinishedAt === "0001-01-01T00:00:00Z"
          ? null
          : info.State.FinishedAt,
      restartCount: info.RestartCount,
    };
  } catch {
    return {
      exists: false,
      running: false,
      status: "not_found",
    };
  }
};

const streamContainerLogs = async (container, deploymentId) => {
  const deploymentLogService = require("./deployment-log.service");

  const logStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    timestamps: false,
  });

  logStream.on("data", async (chunk) => {
    try {
      const message = chunk.toString().trim();

      if (!message) return;

      await deploymentLogService.addLog(deploymentId, message);
    } catch (err) {
      console.error(err);
    }
  });

  logStream.on("error", console.error);
};

const stopContainer = async (projectId) => {
  const container = getContainer(projectId);

  if (!container) {
    throw new Error("Container not found");
  }

  await container.stop();
};

const restartContainer = async (projectId, deploymentId) => {
  const container = getContainer(projectId);

  await container.restart();

  streamContainerLogs(container, deploymentId).catch(console.error);
};

const startContainerByProject = async (projectId, deploymentId) => {
  const container = getContainer(projectId);

  await container.start();

  streamContainerLogs(container, deploymentId).catch(console.error);
};

module.exports = {
  getContainerName,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  inspectContainer,
  getContainer,
  containerExists,
  stopContainerByProject,
  removeContainerByProject,
  getContainerStatus,
  streamContainerLogs,
  restartContainer,
  startContainerByProject,
};
