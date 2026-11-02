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
 * Verifies application health and automatically detects/corrects port if mismatched
 */
const verifyAndDetectPort = async (
  projectId,
  expectedPort,
  {
    deploymentId = null,
    logger = null,
    maxWaitMs = 25000,
    checkIntervalMs = 1000,
  } = {},
) => {
  const targetPort = Number(expectedPort) || 3000;
  let ip;

  try {
    ip = await containerService.getContainerIPAddress(projectId);
  } catch (err) {
    console.warn(
      `[AutoPort] Could not get IP for project ${projectId}:`,
      err.message,
    );
    return { success: false, port: targetPort };
  }

  const startTime = Date.now();
  let attempt = 0;

  console.log(
    `[AutoPort] Starting verification for project ${projectId} on IP ${ip}, expected port ${targetPort}`,
  );

  while (Date.now() - startTime < maxWaitMs) {
    attempt++;

    // 1. First probe the expected port
    try {
      const res = await axios.get(`http://${ip}:${targetPort}`, {
        timeout: 1200,
        validateStatus: () => true, // Any HTTP response (200, 301, 404, 500, etc.) means HTTP server is live!
      });

      console.log(
        `[AutoPort] Confirmed live on expected port ${targetPort} (status ${res.status}) on attempt ${attempt}`,
      );
      return { success: true, port: targetPort, autoDetected: false };
    } catch (err) {
      // If expected port failed, check if the app is already listening on another port
      // We check kernel ports after attempt 2 to give container process a moment to initialize
      if (attempt >= 2) {
        const kernelPorts = await getContainerListeningPorts(projectId);

        // Build list of candidates to probe: kernel listening ports first, then common web ports
        const candidates = Array.from(
          new Set([...kernelPorts, ...COMMON_WEB_PORTS]),
        ).filter((p) => p !== targetPort);

        for (const candidate of candidates) {
          try {
            const probeRes = await axios.get(`http://${ip}:${candidate}`, {
              timeout: 1000,
              validateStatus: () => true,
            });

            console.log(
              `[AutoPort] 🎯 Detected application listening on port ${candidate} (expected: ${targetPort}, HTTP status: ${probeRes.status})`,
            );

            // Found active HTTP server on candidate port!
            // Automatically update deployment record in database
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
          } catch {
            // Not responding on this candidate yet
          }
        }
      }

      await sleep(checkIntervalMs);
    }
  }

  console.warn(
    `[AutoPort] Verification timed out after ${maxWaitMs}ms for project ${projectId} on port ${targetPort}`,
  );
  return { success: false, port: targetPort };
};

const checkApplication = async (
  projectId,
  port,
  { retries = 20, delay = 1000, timeout = 3000 } = {},
) => {
  const result = await verifyAndDetectPort(projectId, port, {
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
