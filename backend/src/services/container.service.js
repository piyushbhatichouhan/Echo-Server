const docker = require("../docker/docker.client");

const getContainerName = (projectId, version = null) => {
  return version ? `echoserver-${projectId}-${version}` : `echoserver-${projectId}`;
};

const getContainerResourceLimits = () => {
  const maxMemMB = Number(process.env.CONTAINER_MAX_MEMORY_MB) || 256;
  const reserveMemMB =
    Number(process.env.CONTAINER_MEMORY_RESERVATION_MB) || 64;
  const maxCpus = Number(process.env.CONTAINER_MAX_CPUS) || 1.5;
  return {
    maxMemoryMB: maxMemMB,
    memoryReservationMB: reserveMemMB,
    maxCpus: maxCpus,
    memoryLimitBytes: maxMemMB * 1024 * 1024,
    memoryReservationBytes: reserveMemMB * 1024 * 1024,
    nanoCpus: Math.round(maxCpus * 1e9),
  };
};

const removeContainerByName = async (nameOrId) => {
  if (!nameOrId) return;
  try {
    const cont = docker.getContainer(nameOrId);
    try {
      await cont.stop({ t: 1 });
    } catch {}
    await cont.remove({ force: true });
  } catch (err) {
    // Ignore if doesn't exist
  }
};

const removePreviousContainers = async (
  projectId,
  keepContainerIdOrName = null,
) => {
  if (!projectId) return;
  try {
    const containers = await docker.listContainers({ all: true });
    const pIdStr = String(projectId);
    const prefix0 = `/echoserver-${pIdStr}-`;
    const prefix1 = `/echohub-${pIdStr}-`;
    const prefix2 = `/echo-project-${pIdStr}-`;
    const exact0 = `/echoserver-${pIdStr}`;
    const exact1 = `/echohub-${pIdStr}`;
    const exact2 = `/echo-project-${pIdStr}`;

    const keepNorm = keepContainerIdOrName
      ? String(keepContainerIdOrName).replace(/^\//, "")
      : null;

    for (const c of containers) {
      const names = c.Names || [];
      const matchesProject = names.some(
        (n) =>
          n === exact0 ||
          n === exact1 ||
          n === exact2 ||
          n.startsWith(prefix0) ||
          n.startsWith(prefix1) ||
          n.startsWith(prefix2),
      );

      if (!matchesProject) continue;

      const isKeep =
        c.Id === keepNorm ||
        names.some((n) => n.replace(/^\//, "") === keepNorm);

      if (isKeep) continue;

      console.log(
        `[ContainerService] Blue-Green cleanup: stopping and removing previous container ${c.Id.slice(0, 12)} (${names.join(", ")}) for project ${projectId}`,
      );
      try {
        const cont = docker.getContainer(c.Id);
        try {
          await cont.stop({ t: 2 });
        } catch {}
        try {
          await cont.remove({ force: true });
        } catch {}
      } catch (err) {
        console.warn(
          `[ContainerService] Error removing old container ${c.Id.slice(0, 12)}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.warn(
      `[ContainerService] removePreviousContainers error for project ${projectId}:`,
      err.message,
    );
  }
};

const findActiveContainer = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }
  const idStr = String(projectId);

  // If already a full container name or docker ID
  if (
    idStr.startsWith("echoserver-") ||
    idStr.startsWith("echohub-") ||
    idStr.startsWith("echo-") ||
    idStr.length >= 64
  ) {
    return docker.getContainer(idStr);
  }

  try {
    // 1. Database check for running deployment container
    try {
      const { pool } = require("../config/database");
      const { rows } = await pool.query(
        `SELECT container_id, container_name FROM deployments WHERE project_id = $1 AND status = 'running' ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
        [projectId],
      );
      if (rows[0]?.container_id) {
        const cont = docker.getContainer(rows[0].container_id);
        const info = await cont.inspect();
        if (info) return cont;
      }
      if (rows[0]?.container_name) {
        const cont = docker.getContainer(rows[0].container_name);
        const info = await cont.inspect();
        if (info) return cont;
      }
    } catch {}

    // 2. Docker container list search
    const containers = await docker.listContainers({ all: true });
    const prefix0 = `/echoserver-${idStr}-`;
    const prefix1 = `/echohub-${idStr}-`;
    const prefix2 = `/echo-project-${idStr}-`;
    const exact0 = `/echoserver-${idStr}`;
    const exact1 = `/echohub-${idStr}`;
    const exact2 = `/echo-project-${idStr}`;

    const projectContainers = containers.filter((c) =>
      (c.Names || []).some(
        (n) =>
          n === exact0 ||
          n === exact1 ||
          n === exact2 ||
          n.startsWith(prefix0) ||
          n.startsWith(prefix1) ||
          n.startsWith(prefix2),
      ),
    );

    if (projectContainers.length > 0) {
      // Prioritize running container
      const running = projectContainers.find((c) => c.State === "running");
      if (running) {
        return docker.getContainer(running.Id);
      }
      projectContainers.sort((a, b) => (b.Created || 0) - (a.Created || 0));
      return docker.getContainer(projectContainers[0].Id);
    }
  } catch {}

  // Fallback to static container name
  return docker.getContainer(getContainerName(projectId));
};

const removeContainerByHostPort = async (hostPort) => {
  if (!hostPort || isNaN(Number(hostPort)) || Number(hostPort) <= 0) return;
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
  options = {},
) => {
  const safeContainerPort = Number(containerPort) || 3000;

  let targetContainerName = null;
  if (typeof options === "string") {
    targetContainerName = options;
  } else if (options && typeof options === "object") {
    targetContainerName =
      options.containerName ||
      (options.version ? getContainerName(projectId, options.version) : null);
  }
  if (!targetContainerName) {
    targetContainerName = getContainerName(projectId);
  }

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

  let resolvedHostPort = hostPort;
  if (
    !resolvedHostPort ||
    isNaN(Number(resolvedHostPort)) ||
    Number(resolvedHostPort) <= 0
  ) {
    const portService = require("./port.service");
    resolvedHostPort = await portService.getAvailablePort(projectId, {
      allowReuse: false,
    });
    console.warn(
      `[ContainerService] Host port was invalid (${hostPort}), allocated free port ${resolvedHostPort} for project ${projectId}`,
    );
  }

  const projectPort = String(resolvedHostPort);

  // Blue-Green: Only clean up any existing container with the exact target name or zombie on hostPort.
  // (Do NOT remove other running project containers so the current live deployment remains online!)
  await removeContainerByName(targetContainerName);
  await removeContainerByHostPort(projectPort);

  const limits = getContainerResourceLimits();
  const hostIp = process.env.DOCKER_HOST_BIND_IP || "127.0.0.1";

  const containerOptions = {
    Image: imageName,

    name: targetContainerName,

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
            HostIp: hostIp,
            HostPort: projectPort,
          },
        ],
      },

      // Workload Protection & Resource Shields
      Memory: limits.memoryLimitBytes,
      MemoryReservation: limits.memoryReservationBytes,
      MemorySwap: limits.memoryLimitBytes * 2,
      NanoCpus: limits.nanoCpus,
      OomScoreAdj: 500,
      PidsLimit: 256, // Prevent fork bomb DoS from exhausting host kernel process table
      SecurityOpt: ["no-new-privileges:true"], // Block privilege escalation inside container
    },

    NetworkingConfig: process.env.DOCKER_NETWORK
      ? {
          EndpointsConfig: {
            [process.env.DOCKER_NETWORK]: {},
          },
        }
      : undefined,
  };

  const container = await docker.createContainer(containerOptions);

  // Connect to Docker network AFTER creation
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

const getContainer = (projectIdOrIdentifier) => {
  if (!projectIdOrIdentifier) {
    throw new Error("Container identifier is required");
  }
  const idStr = String(projectIdOrIdentifier);
  if (
    idStr.startsWith("echohub-") ||
    idStr.startsWith("echo-") ||
    idStr.length >= 64
  ) {
    return docker.getContainer(idStr);
  }
  return docker.getContainer(getContainerName(projectIdOrIdentifier));
};

const containerExists = async (projectId) => {
  try {
    const container = await findActiveContainer(projectId);
    await container.inspect();
    return true;
  } catch {
    return false;
  }
};

const stopContainerByProject = async (projectId, exceptContainerId = null) => {
  if (!projectId) return;
  const pIdStr = String(projectId);
  const keepNorm = exceptContainerId
    ? String(exceptContainerId).replace(/^\//, "")
    : null;

  // 1. Direct stop by recorded container_id or container_name from database
  try {
    const { pool } = require("../config/database");
    const { rows } = await pool.query(
      `SELECT container_id, container_name FROM deployments WHERE project_id = $1 ORDER BY CASE WHEN status = 'running' THEN 0 ELSE 1 END, updated_at DESC, created_at DESC LIMIT 1`,
      [projectId],
    );
    if (rows[0]?.container_id && rows[0].container_id !== keepNorm) {
      try {
        const cont = docker.getContainer(rows[0].container_id);
        await cont.stop({ t: 2 });
      } catch {}
    }
    if (rows[0]?.container_name && rows[0].container_name !== keepNorm) {
      try {
        const cont = docker.getContainer(rows[0].container_name);
        await cont.stop({ t: 2 });
      } catch {}
    }
  } catch {}

  // 2. Scan and stop all project containers matching prefixes
  try {
    const containers = await docker.listContainers({ all: true });
    const prefix0 = `/echoserver-${pIdStr}-`;
    const prefix1 = `/echohub-${pIdStr}-`;
    const prefix2 = `/echo-project-${pIdStr}-`;
    const exact0 = `/echoserver-${pIdStr}`;
    const exact1 = `/echohub-${pIdStr}`;
    const exact2 = `/echo-project-${pIdStr}`;

    for (const c of containers) {
      const names = c.Names || [];
      const matches = names.some(
        (n) =>
          n === exact0 ||
          n === exact1 ||
          n === exact2 ||
          n.startsWith(prefix0) ||
          n.startsWith(prefix1) ||
          n.startsWith(prefix2),
      );
      if (matches) {
        if (
          keepNorm &&
          (c.Id === keepNorm ||
            names.some((n) => n.replace(/^\//, "") === keepNorm))
        ) {
          continue;
        }
        try {
          const cont = docker.getContainer(c.Id);
          await cont.stop({ t: 2 });
        } catch {}
      }
    }
  } catch {
    try {
      const container = getContainer(projectId);
      await container.stop();
    } catch {}
  }
};

const removeContainerByProject = async (
  projectId,
  exceptContainerId = null,
) => {
  if (!projectId) return;
  const pIdStr = String(projectId);
  const keepNorm = exceptContainerId
    ? String(exceptContainerId).replace(/^\//, "")
    : null;

  // 1. Direct removal by recorded container_id or container_name from database
  try {
    const { pool } = require("../config/database");
    const { rows } = await pool.query(
      `SELECT container_id, container_name FROM deployments WHERE project_id = $1 ORDER BY CASE WHEN status = 'running' THEN 0 ELSE 1 END, updated_at DESC, created_at DESC LIMIT 1`,
      [projectId],
    );
    if (rows[0]?.container_id && rows[0].container_id !== keepNorm) {
      try {
        const cont = docker.getContainer(rows[0].container_id);
        await cont.stop({ t: 1 }).catch(() => {});
        await cont.remove({ force: true }).catch(() => {});
      } catch {}
    }
    if (rows[0]?.container_name && rows[0].container_name !== keepNorm) {
      try {
        const cont = docker.getContainer(rows[0].container_name);
        await cont.stop({ t: 1 }).catch(() => {});
        await cont.remove({ force: true }).catch(() => {});
      } catch {}
    }
  } catch {}

  // 2. Scan Docker containers
  try {
    const containers = await docker.listContainers({ all: true });
    const prefix0 = `/echoserver-${pIdStr}-`;
    const prefix1 = `/echohub-${pIdStr}-`;
    const prefix2 = `/echo-project-${pIdStr}-`;
    const exact0 = `/echoserver-${pIdStr}`;
    const exact1 = `/echohub-${pIdStr}`;
    const exact2 = `/echo-project-${pIdStr}`;

    for (const c of containers) {
      const names = c.Names || [];
      const matches = names.some(
        (n) =>
          n === exact0 ||
          n === exact1 ||
          n === exact2 ||
          n.startsWith(prefix0) ||
          n.startsWith(prefix1) ||
          n.startsWith(prefix2),
      );
      if (matches) {
        if (
          keepNorm &&
          (c.Id === keepNorm ||
            names.some((n) => n.replace(/^\//, "") === keepNorm))
        ) {
          continue;
        }
        try {
          const cont = docker.getContainer(c.Id);
          try {
            await cont.stop({ t: 1 });
          } catch {}
          await cont.remove({ force: true });
        } catch {}
      }
    }
  } catch {
    try {
      const container = getContainer(projectId);
      await container.remove({ force: true });
    } catch {}
  }
};

const getContainerStatus = async (projectId) => {
  try {
    const container = await findActiveContainer(projectId);
    if (!container) {
      return {
        exists: false,
        running: false,
        status: "stopped",
      };
    }
    const info = await container.inspect();

    return {
      exists: true,
      running: Boolean(info.State.Running),

      status: info.State.Running ? "running" : "stopped",

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
      status: "stopped",
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

      await deploymentLogService.addLog(deploymentId, message, null, "runtime");
    } catch (err) {
      console.error(err);
    }
  });

  logStream.on("error", console.error);
};

const stopContainer = async (projectId) => {
  await stopContainerByProject(projectId);
};

const restartContainer = async (projectId, deploymentId) => {
  const container = await findActiveContainer(projectId);

  if (!container) {
    throw new Error("Container not found");
  }

  await container.restart();

  streamContainerLogs(container, deploymentId).catch(console.error);
};

const startContainerByProject = async (projectId, deploymentId) => {
  const container = await findActiveContainer(projectId);

  if (!container) {
    throw new Error("Container not found");
  }

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
  const container = await findActiveContainer(projectId);
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
  const container = await findActiveContainer(projectId);
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
    const container = await findActiveContainer(projectId);
    const stats = await container.stats({ stream: false });
    const limits = getContainerResourceLimits();

    const memoryUsed = stats.memory_stats?.usage || 0;
    // Container allowance memory limit (e.g. 256MB), NOT the whole host system RAM!
    const memoryLimit = limits.memoryLimitBytes;

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

    // CPU measured against container's allowed CPU quota (e.g. 1.5 CPUs)
    const maxCpus = limits.maxCpus || 1.5;
    const cpuPercentOfAllowance = Math.min(
      100,
      Math.round((cpuPercent / maxCpus) * 10) / 10,
    );

    const memoryPercent =
      memoryLimit > 0
        ? Math.min(100, Math.round((memoryUsed / memoryLimit) * 1000) / 10)
        : 0;

    const memoryUsedMB = (memoryUsed / (1024 * 1024)).toFixed(1);
    const memoryLimitMB = Math.round(memoryLimit / (1024 * 1024));
    const memoryFormatted = `${memoryUsedMB} MB / ${memoryLimitMB} MB (${memoryPercent}%)`;

    return {
      running: true,
      memoryUsed,
      memoryLimit,
      memoryPercent,
      memoryFormatted,
      cpuPercent: cpuPercentOfAllowance,
      rawCpuPercent: cpuPercent,
      maxCpus,
      pids: stats.pids_stats?.current || 0,
    };
  } catch {
    return {
      running: false,
      memoryUsed: 0,
      memoryLimit: 0,
      memoryPercent: 0,
      memoryFormatted: "0 MB",
      cpuPercent: 0,
      pids: 0,
    };
  }
};

const MAX_TERMINAL_OUTPUT_BYTES = 256 * 1024; // 256 KB max output buffer to prevent OOM DoS
const TERMINAL_TIMEOUT_MS = 25000; // 25 seconds timeout to prevent process stall DoS

const executeTerminalCommand = async (projectId, command) => {
  const container = await findActiveContainer(projectId);
  const exec = await container.exec({
    Cmd: ["sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });

  return new Promise((resolve, reject) => {
    let output = "";
    let isSettled = false;
    let outputExceeded = false;

    const cleanupAndResolve = (finalData) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      try {
        if (typeof stream.destroy === "function") {
          stream.destroy();
        }
      } catch {}
      resolve(finalData);
    };

    const timer = setTimeout(() => {
      cleanupAndResolve({
        output:
          (output.trim() ? output.trim() + "\n" : "") +
          "[Execution timed out after 25 seconds]",
        exitCode: 124,
      });
    }, TERMINAL_TIMEOUT_MS);

    stream.on("data", (chunk) => {
      if (outputExceeded || isSettled) return;

      let text = "";
      if (chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)) {
        text = chunk.slice(8).toString("utf8");
      } else {
        text = chunk.toString("utf8");
      }

      if (Buffer.byteLength(output + text, "utf8") > MAX_TERMINAL_OUTPUT_BYTES) {
        outputExceeded = true;
        output += text;
        output =
          output.slice(0, MAX_TERMINAL_OUTPUT_BYTES) +
          "\n[Output truncated: exceeded 256KB buffer limit]";
        cleanupAndResolve({
          output: output.trim(),
          exitCode: 0,
        });
        return;
      }

      output += text;
    });

    stream.on("end", async () => {
      if (isSettled) return;
      try {
        const inspect = await exec.inspect();
        cleanupAndResolve({
          output: output.trim() || "(Command executed with no output)",
          exitCode: inspect.ExitCode ?? 0,
        });
      } catch (err) {
        cleanupAndResolve({ output: output.trim(), exitCode: 0 });
      }
    });

    stream.on("error", (err) => {
      if (isSettled) return;
      clearTimeout(timer);
      isSettled = true;
      reject(err);
    });
  });
};

module.exports = {
  getContainerName,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  removeContainerByName,
  removePreviousContainers,
  findActiveContainer,
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
  getContainerResourceLimits,
};

