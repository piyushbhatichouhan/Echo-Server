const axios = require("axios");
const containerService = require("./container.service");
const { pool } = require("../config/database");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COMMON_WEB_PORTS = [
  3000, 4000, 5000, 8000, 8080, 5173, 4173, 8888, 3001, 8081, 80,
];

/**
 * Extracts listening TCP ports from container's /proc/net/tcp and /proc/net/tcp6
 */
const getContainerListeningPorts = async (projectId) => {
  try {
    const container = containerService.getContainer(projectId);
    const exec = await container.exec({
      Cmd: [
        "sh",
        "-c",
        "cat /proc/net/tcp /proc/net/tcp6 2>/dev/null || cat /proc/net/tcp 2>/dev/null",
      ],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    const output = await new Promise((resolve) => {
      let data = "";
      stream.on("data", (chunk) => {
        data += chunk.toString("utf8");
      });
      stream.on("end", () => resolve(data));
      stream.on("error", () => resolve(""));
      setTimeout(() => resolve(data), 2000);
    });

    const ports = [];
    const regex = /:([0-9A-Fa-f]{4})\s+[0-9A-Fa-f:]+\s+0A\b/g;
    let match;
    while ((match = regex.exec(output)) !== null) {
      const portNum = parseInt(match[1], 16);
      if (portNum > 0 && portNum <= 65535 && !ports.includes(portNum)) {
        ports.push(portNum);
      }
    }
    return ports;
  } catch (err) {
    return [];
  }
};

/**
 * Probes a single HTTP URL. Any HTTP response (2xx, 3xx, 4xx, 5xx) confirms the HTTP service is listening.
 */
const probeUrl = async (url) => {
  try {
    const res = await axios.get(url, {
      timeout: 1000,
      validateStatus: () => true,
      maxRedirects: 0,
    });
    return { success: true, status: res.status, url };
  } catch {
    return { success: false, url };
  }
};

/**
 * Probes multiple URLs in parallel and returns the first responding endpoint.
 */
const probeAny = async (urls) => {
  if (!urls || urls.length === 0) return null;
  return new Promise((resolve) => {
    let pending = urls.length;
    let resolved = false;

    urls.forEach((url) => {
      probeUrl(url).then((res) => {
        if (res.success && !resolved) {
          resolved = true;
          resolve(res);
        } else {
          pending--;
          if (pending === 0 && !resolved) {
            resolve(null);
          }
        }
      });
    });
  });
};

/**
 * Builds candidate probe URLs across host port, container name DNS, and internal network IPs.
 */
const buildProbeUrls = (portToTest, connInfo, hostPort, targetPort) => {
  const urls = [];

  // 1. Mapped host port (for host processes on Windows, macOS, or Linux)
  const mappedHostPort =
    portToTest === targetPort && hostPort
      ? hostPort
      : connInfo.hostPortsByContainerPort?.[portToTest];

  if (mappedHostPort) {
    urls.push(`http://127.0.0.1:${mappedHostPort}`);
    urls.push(`http://localhost:${mappedHostPort}`);
  }

  // 2. Container name DNS on Docker network
  if (connInfo.containerName) {
    urls.push(`http://${connInfo.containerName}:${portToTest}`);
  }

  // 3. Network IPs (DOCKER_NETWORK IP first, bridge IP fallback)
  if (Array.isArray(connInfo.ips)) {
    for (const ip of connInfo.ips) {
      urls.push(`http://${ip}:${portToTest}`);
    }
  }

  return Array.from(new Set(urls));
};

/**
 * Verifies application health and automatically detects/corrects port if mismatched
 */
const verifyAndDetectPort = async (
  projectId,
  expectedPort,
  {
    deploymentId = null,
    logger = null,
    hostPort = null,
    maxWaitMs = 25000,
    checkIntervalMs = 1000,
  } = {},
) => {
  const targetPort = Number(expectedPort) || 3000;
  const startTime = Date.now();
  let attempt = 0;

  console.log(
    `[AutoPort] Starting verification for project ${projectId}, expected port ${targetPort}, host port ${hostPort || "auto"}`,
  );

  while (Date.now() - startTime < maxWaitMs) {
    attempt++;

    let connInfo;
    try {
      connInfo = await containerService.getContainerConnectionInfo(projectId);
    } catch (err) {
      console.warn(
        `[AutoPort] Attempt ${attempt}: Container inspect failed for project ${projectId}:`,
        err.message,
      );
      await sleep(checkIntervalMs);
      continue;
    }

    // Fast-fail: If container exited prematurely, abort immediately and surface logs
    if (!connInfo.state.running && connInfo.state.status !== "created") {
      let recentLogs = "";
      try {
        const rawLogs = await connInfo.container.logs({
          stdout: true,
          stderr: true,
          tail: 20,
        });
        recentLogs = rawLogs
          .toString("utf8")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .trim();
      } catch {}

      const exitMsg = `Container exited prematurely with exit code ${connInfo.state.exitCode} (${connInfo.state.status}).${recentLogs ? ` Recent logs: ${recentLogs.slice(-300)}` : ""}`;
      console.warn(`[AutoPort] ${exitMsg}`);

      if (logger && deploymentId) {
        await logger.error(deploymentId, exitMsg);
      }

      return {
        success: false,
        port: targetPort,
        exited: true,
        exitCode: connInfo.state.exitCode,
        logs: recentLogs,
      };
    }

    // 1. Probe the expected target port across all reachable endpoints
    const expectedUrls = buildProbeUrls(
      targetPort,
      connInfo,
      hostPort,
      targetPort,
    );

    const probeRes = await probeAny(expectedUrls);
    if (probeRes && probeRes.success) {
      console.log(
        `[AutoPort] Confirmed live on expected port ${targetPort} via ${probeRes.url} (status ${probeRes.status}) on attempt ${attempt}`,
      );
      return { success: true, port: targetPort, autoDetected: false };
    }

    // 2. If expected port did not respond, check if the app is listening on another port
    // We check kernel ports after attempt 2 to give container process a moment to initialize
    if (attempt >= 2) {
      const kernelPorts = await getContainerListeningPorts(projectId);

      const candidates = Array.from(
        new Set([...kernelPorts, ...COMMON_WEB_PORTS]),
      ).filter((p) => p !== targetPort);

      for (const candidate of candidates) {
        const candidateUrls = buildProbeUrls(
          candidate,
          connInfo,
          hostPort,
          targetPort,
        );
        const candidateRes = await probeAny(candidateUrls);

        if (candidateRes && candidateRes.success) {
          console.log(
            `[AutoPort] 🎯 Detected application listening on port ${candidate} via ${candidateRes.url} (expected: ${targetPort}, HTTP status: ${candidateRes.status})`,
          );

          if (deploymentId) {
            await pool.query(
              `UPDATE deployments SET container_port = $2, updated_at = NOW() WHERE id = $1`,
              [deploymentId, candidate],
            );
          }

          if (logger && deploymentId) {
            await logger.info(
              deploymentId,
              `🔍 Auto-detected application listening on port ${candidate} (configured: ${targetPort}). Updated routing automatically.`,
            );
          }

          return {
            success: true,
            port: candidate,
            autoDetected: true,
          };
        }
      }
    }

    await sleep(checkIntervalMs);
  }

  console.warn(
    `[AutoPort] Verification timed out after ${maxWaitMs}ms for project ${projectId} on port ${targetPort}`,
  );
  return { success: false, port: targetPort };
};

const checkApplication = async (
  projectId,
  port,
  {
    deploymentId = null,
    logger = null,
    hostPort = null,
    retries = 25,
    delay = 1000,
  } = {},
) => {
  const result = await verifyAndDetectPort(projectId, port, {
    deploymentId,
    logger,
    hostPort,
    maxWaitMs: retries * delay,
    checkIntervalMs: delay,
  });
  return result.success;
};

module.exports = {
  checkApplication,
  verifyAndDetectPort,
  getContainerListeningPorts,
};
