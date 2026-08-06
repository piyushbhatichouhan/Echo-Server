const docker = require("../docker/docker.client");

const getContainerName = (projectId) => {
  return `echohub-${projectId}`;
};

const createContainer = async (
  projectId,
  imageName,
  environment,
  containerPort,
) => {
  const dockerEnvironment = [
    ...environment.map(({ key, value }) => `${key}=${value}`),
    "CONTAINER_PORT=3000",
  ];

  const portVariable = environment.find((e) => e.key === "PORT");

  if (!portVariable) {
    throw new Error("Runtime environment missing PORT.");
  }

  const projectPort = String(portVariable.value);

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
            HostPort: projectPort,
          },
        ],
      },
    },
  };

  const container = await docker.createContainer(containerOptions);

  //
  // Connect to Docker network AFTER creation
  //
  if (process.env.DOCKER_NETWORK) {
    try {
      const network = docker.getNetwork(process.env.DOCKER_NETWORK);

      await network.connect({
        Container: container.id,
      });
    } catch (err) {
      console.warn("Network connect skipped:", err.message);
    }
  }
  container.echoName = containerOptions.name;
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

      exitCode: info.State.ExitCode,

      oomKilled: info.State.OOMKilled,

      error: info.State.Error,

      startedAt: info.State.StartedAt,

      finishedAt: info.State.FinishedAt,

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
      const message = chunk
        .toString("utf8")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim();

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

const waitUntilContainerRunning = async (
  container,
  { retries = 20, delay = 1000 } = {},
) => {
  for (let i = 0; i < retries; i++) {
    const info = await container.inspect();

    if (info.State.Running) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Container did not enter running state.");
};

const getContainerIPAddress = async (projectId) => {
  const container = getContainer(projectId);

  const info = await container.inspect();

  const networks = info.NetworkSettings.Networks;

  const firstNetwork = Object.values(networks)[0];

  if (!firstNetwork?.IPAddress) {
    throw new Error("Container has no network IP.");
  }

  return firstNetwork.IPAddress;
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
  waitUntilContainerRunning,
  getContainerIPAddress,
};
