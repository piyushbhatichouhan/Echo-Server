const docker = require("../docker/docker.client");

const getContainerName = (projectId) => {
  return `echohub-${projectId}`;
};

const removeContainerByHostPort = async (hostPort) => {
  if (!hostPort) return;
  try {
    const containers = await docker.listContainers({ all: true });
    for (const c of containers) {
      const match = (c.Ports || []).some(
        (p) => Number(p.PublicPort) === Number(hostPort),
      );
      if (match) {
        console.warn(
          `[ContainerService] Host port ${hostPort} occupied by container ${c.Id.slice(0, 12)} (${c.Names?.join(", ")}). Removing conflicting container...`,
        );
        const cont = docker.getContainer(c.Id);
        try {
          await cont.stop({ t: 1 });
        } catch {}
        try {
          await cont.remove({ force: true });
        } catch {}
      }
    }
  } catch (err) {
    console.warn("[ContainerService] removeContainerByHostPort warning:", err.message);
  }
};

const createContainer = async (
  projectId,
  imageName,
  environment,
  hostPort,
  containerPort,
) => {
  const safeContainerPort = Number(containerPort) || 3000;

  const envMap = new Map();

  // Set default system environment variables
  envMap.set("HOST", "0.0.0.0");
  envMap.set("PYTHONUNBUFFERED", "1");

  // Load project environment variables
  if (Array.isArray(environment)) {
    for (const item of environment) {
      if (item && item.key) {
        envMap.set(item.key, String(item.value ?? ""));
      }
    }
  }

  // Ensure PORT and CONTAINER_PORT strictly match the container port
  envMap.set("PORT", String(safeContainerPort));
  envMap.set("CONTAINER_PORT", String(safeContainerPort));

  const dockerEnvironment = Array.from(envMap.entries()).map(
    ([key, value]) => `${key}=${value}`,
  );

  const projectPort = String(hostPort);

  // Guarantee no container name or port collision exists in Docker
  await removeContainerByProject(projectId);
  await removeContainerByHostPort(projectPort);

  const containerOptions = {
    Image: imageName,

    name: getContainerName(projectId),

    Env: dockerEnvironment,

    ExposedPorts: {
      [`${safeContainerPort}/tcp`]: {},
    },

    HostConfig: {
      RestartPolicy: {
        Name: "unless-stopped",
      },

      PortBindings: {
        [`${safeContainerPort}/tcp`]: [
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
  try {
    await container.start();
  } catch (err) {
    if (err.message && err.message.includes("port is already allocated")) {
      console.warn(
        `[ContainerService] Port conflict during container start: ${err.message}. Retrying after host cleanup...`,
      );
      try {
        const inspect = await container.inspect();
        const portBindings = inspect.HostConfig?.PortBindings || {};
        for (const bindings of Object.values(portBindings)) {
          for (const b of bindings) {
            if (b.HostPort) {
              await removeContainerByHostPort(b.HostPort);
            }
          }
        }
        await new Promise((res) => setTimeout(res, 500));
        await container.start();
      } catch (retryErr) {
        throw new Error(
          `Host port bind failed: ${err.message}. The port is currently occupied by another process.`,
        );
      }
    } else {
      throw err;
    }
  }

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
  const networks = info.NetworkSettings?.Networks || {};

  if (
    process.env.DOCKER_NETWORK &&
    networks[process.env.DOCKER_NETWORK]?.IPAddress
  ) {
    return networks[process.env.DOCKER_NETWORK].IPAddress;
  }

  for (const net of Object.values(networks)) {
    if (net?.IPAddress) {
      return net.IPAddress;
    }
  }

  if (info.NetworkSettings?.IPAddress) {
    return info.NetworkSettings.IPAddress;
  }

  throw new Error("Container has no network IP.");
};

const getContainerConnectionInfo = async (projectId) => {
  const container = getContainer(projectId);
  const info = await container.inspect();

  const rawName = info.Name || "";
  const containerName = rawName.startsWith("/") ? rawName.slice(1) : rawName;

  const networks = info.NetworkSettings?.Networks || {};
  const ips = [];

  if (
    process.env.DOCKER_NETWORK &&
    networks[process.env.DOCKER_NETWORK]?.IPAddress
  ) {
    ips.push(networks[process.env.DOCKER_NETWORK].IPAddress);
  }

  for (const net of Object.values(networks)) {
    if (net?.IPAddress && !ips.includes(net.IPAddress)) {
      ips.push(net.IPAddress);
    }
  }

  if (
    info.NetworkSettings?.IPAddress &&
    !ips.includes(info.NetworkSettings.IPAddress)
  ) {
    ips.push(info.NetworkSettings.IPAddress);
  }

  const portBindings =
    info.HostConfig?.PortBindings || info.NetworkSettings?.Ports || {};
  const hostPortsByContainerPort = {};
  for (const [key, bindings] of Object.entries(portBindings)) {
    const containerPortNum = parseInt(key, 10);
    if (Array.isArray(bindings) && bindings[0]?.HostPort) {
      hostPortsByContainerPort[containerPortNum] = Number(bindings[0].HostPort);
    }
  }

  return {
    container,
    containerName,
    ips,
    hostPortsByContainerPort,
    state: {
      running: Boolean(info.State?.Running),
      status: info.State?.Status || "unknown",
      exitCode: info.State?.ExitCode ?? 0,
      oomKilled: Boolean(info.State?.OOMKilled),
      error: info.State?.Error || null,
    },
  };
};

const getContainerTelemetry = async (projectId) => {
  try {
    const container = getContainer(projectId);
    const stats = await container.stats({ stream: false });

    const memoryUsed = stats.memory_stats?.usage || 0;
    const memoryLimit = stats.memory_stats?.limit || 0;

    let cpuPercent = 0;
    const cpuDelta =
      (stats.cpu_stats?.cpu_usage?.total_usage || 0) -
      (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta =
      (stats.cpu_stats?.system_cpu_usage || 0) -
      (stats.precpu_stats?.system_cpu_usage || 0);
    const onlineCpus =
      stats.cpu_stats?.online_cpus ||
      stats.cpu_stats?.cpu_usage?.percpu_usage?.length ||
      1;

    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = Math.min(
        100,
        Math.round((cpuDelta / systemDelta) * onlineCpus * 1000) / 10,
      );
    }

    return {
      running: true,
      memoryUsed,
      memoryLimit,
      cpuPercent,
      pids: stats.pids_stats?.current || 0,
    };
  } catch {
    return {
      running: false,
      memoryUsed: 0,
      memoryLimit: 0,
      cpuPercent: 0,
      pids: 0,
    };
  }
};

const executeTerminalCommand = async (projectId, command) => {
  const container = getContainer(projectId);
  const exec = await container.exec({
    Cmd: ["sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });

  return new Promise((resolve, reject) => {
    let output = "";
    stream.on("data", (chunk) => {
      // Strip docker multiplex header (first 8 bytes per frame) if present
      if (chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)) {
        output += chunk.slice(8).toString("utf8");
      } else {
        output += chunk.toString("utf8");
      }
    });

    stream.on("end", async () => {
      try {
        const inspect = await exec.inspect();
        resolve({
          output: output.trim() || "(Command executed with no output)",
          exitCode: inspect.ExitCode ?? 0,
        });
      } catch (err) {
        resolve({ output: output.trim(), exitCode: 0 });
      }
    });

    stream.on("error", (err) => reject(err));
  });
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
  getContainerConnectionInfo,
  getContainerTelemetry,
  executeTerminalCommand,
  removeContainerByHostPort,
};
