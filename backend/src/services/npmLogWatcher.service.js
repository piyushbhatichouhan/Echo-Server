const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");
const analyticsRepo = require("../repositories/analytics.repository");
const crypto = require("crypto");

/**
 * Anonymizes client IP addresses using SHA-256
 */
const hashIp = (ip) => {
  return crypto
    .createHash("sha256")
    .update(ip || "127.0.0.1")
    .digest("hex")
    .substring(0, 16);
};

// In-memory cache of hostname -> { projectId, userId }
const hostnameCache = new Map();

// File tail tracking: filePath -> byteOffset
const fileOffsets = new Map();

// Queue for high-throughput batch database insertion
let pendingQueue = [];
let flushInterval = null;
let cacheRefreshInterval = null;
let isStarted = false;

// Active watchers
const activeWatchers = [];

/**
 * Refreshes active publication hostnames into the in-memory lookup cache
 */
const refreshHostnameCache = async () => {
  try {
    const { rows } = await pool.query(`
      SELECT LOWER(pd.hostname) AS hostname, p.id AS project_id, p.owner_id AS user_id
      FROM project_domains pd
      JOIN projects p ON p.id = pd.project_id
      WHERE pd.publication_status = 'active'
    `);

    hostnameCache.clear();
    for (const r of rows) {
      hostnameCache.set(r.hostname.trim(), {
        projectId: r.project_id,
        userId: r.user_id,
      });
    }
  } catch (err) {
    console.warn("[NpmLogWatcher] Hostname cache refresh notice:", err.message);
  }
};

/**
 * Parses an Nginx / NPM access log line into a structured telemetry object
 */
const parseLogLine = (line, defaultHost = null) => {
  if (!line || typeof line !== "string") return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Format 1: NPM standard format
  // [07/Nov/2026:14:20:30 +0000] - 200 0.045 - GET https myapp.devpiyush.in "/api/data?q=1" [Client 198.51.100.42] [Length 1240]
  const npmRegex =
    /^\[([^\]]+)\]\s+-\s+(\d{3})\s+([\d.]+)\s+-\s+([A-Z]+)\s+\S+\s+(\S+)\s+"([^"]*)"\s+\[Client\s+([^\]]+)\]\s+\[Length\s+(\d+)\]/;
  const m1 = trimmed.match(npmRegex);
  if (m1) {
    const status = parseInt(m1[2], 10);
    const latencySec = parseFloat(m1[3]);
    const rawPath = m1[6].split("?")[0];
    return {
      timestamp: new Date(),
      statusCode: status,
      responseTimeMs: Math.round(latencySec * 1000),
      method: m1[4].toUpperCase(),
      hostname: m1[5].toLowerCase(),
      path: rawPath || "/",
      ipHash: hashIp(m1[7].trim()),
      bytesSent: parseInt(m1[8], 10) || 0,
    };
  }

  // Format 2: Combined format with optional Host or defaultHost
  // 198.51.100.42 - - [07/Nov/2026:14:20:30 +0000] "GET /api/data HTTP/1.1" 200 1240 ...
  const combinedRegex =
    /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([A-Z]+)\s+([^\s"]+)[^"]*"\s+(\d{3})\s+(\d+)/;
  const m2 = trimmed.match(combinedRegex);
  if (m2 && defaultHost) {
    const status = parseInt(m2[5], 10);
    const rawPath = m2[4].split("?")[0];
    return {
      timestamp: new Date(),
      statusCode: status,
      responseTimeMs: 30, // default nominal estimate if not recorded
      method: m2[3].toUpperCase(),
      hostname: defaultHost.toLowerCase(),
      path: rawPath || "/",
      ipHash: hashIp(m2[1].trim()),
      bytesSent: parseInt(m2[6], 10) || 0,
    };
  }

  return null;
};

/**
 * Queues a parsed telemetry entry for database insertion
 */
const queueEntry = (entry) => {
  if (!entry || !entry.hostname) return;

  const target = hostnameCache.get(entry.hostname);
  if (!target) return; // Disregard requests for domains not hosted on this platform

  pendingQueue.push({
    projectId: target.projectId,
    userId: target.userId,
    timestamp: entry.timestamp || new Date(),
    statusCode: entry.statusCode || 200,
    responseTimeMs: entry.responseTimeMs || 0,
    ipHash: entry.ipHash,
    method: entry.method || "GET",
    path: entry.path || "/",
    bytesSent: entry.bytesSent || 0,
  });

  if (pendingQueue.length >= 100) {
    flushQueue().catch(() => {});
  }
};

/**
 * Flushes pending telemetry records into the database
 */
const flushQueue = async () => {
  if (pendingQueue.length === 0) return;

  const batch = pendingQueue.splice(0, pendingQueue.length);
  try {
    await analyticsRepo.insertBatch(batch);
  } catch (err) {
    console.warn("[NpmLogWatcher] Telemetry batch flush notice:", err.message);
  }
};

/**
 * Tails a specific log file from its last read offset
 */
const tailFile = (filePath, defaultHost = null) => {
  try {
    const stats = fs.statSync(filePath);
    const prevOffset = fileOffsets.get(filePath) || stats.size;

    if (stats.size <= prevOffset) {
      // File has not grown (or was truncated/rotated)
      if (stats.size < prevOffset) {
        fileOffsets.set(filePath, 0);
      }
      return;
    }

    const readLen = stats.size - prevOffset;
    const buffer = Buffer.alloc(readLen);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, readLen, prevOffset);
    fs.closeSync(fd);

    fileOffsets.set(filePath, stats.size);

    const chunk = buffer.toString("utf8");
    const lines = chunk.split("\n");

    for (const line of lines) {
      const entry = parseLogLine(line, defaultHost);
      if (entry) {
        queueEntry(entry);
      }
    }
  } catch (err) {
    // Ignore transient file read errors
  }
};

/**
 * Discovers and monitors NPM access log files in candidate directories
 */
const scanAndWatchLogFiles = (logsDir) => {
  try {
    if (!fs.existsSync(logsDir)) return;

    console.log(`[NpmLogWatcher] Monitoring Nginx Proxy Manager logs in: ${logsDir}`);

    const checkDir = () => {
      try {
        const files = fs.readdirSync(logsDir);
        for (const file of files) {
          if (file.endsWith("_access.log") || file === "access.log" || file === "echo_analytics.log") {
            const fullPath = path.join(logsDir, file);
            if (!fileOffsets.has(fullPath)) {
              try {
                const stats = fs.statSync(fullPath);
                // Start tailing from current end of file so we don't duplicate old logs
                fileOffsets.set(fullPath, stats.size);
              } catch {}
            }
            tailFile(fullPath);
          }
        }
      } catch {}
    };

    checkDir();
    const watcher = fs.watch(logsDir, { persistent: false }, (eventType, filename) => {
      if (filename && (filename.endsWith("_access.log") || filename === "access.log" || filename === "echo_analytics.log")) {
        const fullPath = path.join(logsDir, filename);
        tailFile(fullPath);
      }
    });

    activeWatchers.push(watcher);
  } catch (err) {
    console.warn(`[NpmLogWatcher] Notice monitoring dir ${logsDir}:`, err.message);
  }
};

/**
 * Attempts to attach to Nginx Proxy Manager or Router Docker container logs
 */
const attachDockerContainerWatcher = async () => {
  try {
    const docker = require("../docker/docker.client");
    const containers = await docker.listContainers({ all: false });

    // Find NPM or router container
    const npmContainerInfo = containers.find((c) => {
      const name = (c.Names || []).join(" ").toLowerCase();
      const image = (c.Image || "").toLowerCase();
      return (
        name.includes("npm") ||
        name.includes("proxy-manager") ||
        name.includes("echo-router") ||
        image.includes("nginxproxymanager")
      );
    });

    if (!npmContainerInfo) return;

    console.log(
      `[NpmLogWatcher] Attached to Docker container telemetry stream: ${npmContainerInfo.Names?.join(", ")} (${npmContainerInfo.Id.slice(0, 12)})`,
    );

    const cont = docker.getContainer(npmContainerInfo.Id);
    const stream = await cont.logs({
      follow: true,
      stdout: true,
      stderr: false,
      tail: 0,
      timestamps: false,
    });

    stream.on("data", (chunk) => {
      try {
        let text = chunk.toString("utf8");
        // Strip docker multiplex header (first 8 bytes per frame) if present
        if (chunk.length > 8 && (chunk[0] === 1 || chunk[0] === 2)) {
          text = chunk.slice(8).toString("utf8");
        }

        const lines = text.split("\n");
        for (const line of lines) {
          const entry = parseLogLine(line);
          if (entry) {
            queueEntry(entry);
          }
        }
      } catch {}
    });

    stream.on("error", () => {});
  } catch (err) {
    // Docker is optional or in host dev mode
  }
};

/**
 * Starts the NpmLogWatcher service
 */
const start = async () => {
  if (isStarted) return;
  isStarted = true;

  await refreshHostnameCache();

  // Refresh hostname mapping every 30 seconds
  cacheRefreshInterval = setInterval(refreshHostnameCache, 30000).unref();

  // Periodic flush every 1500ms
  flushInterval = setInterval(() => {
    flushQueue().catch(() => {});
  }, 1500).unref();

  // Scan candidate NPM log directories
  const candidateDirs = [
    process.env.NPM_LOGS_DIR,
    process.env.NPM_LOG_PATH,
    "/data/logs",
    "/srv/npm/data/logs",
    path.resolve(process.cwd(), "data/logs"),
    path.resolve(process.cwd(), "../data/logs"),
    path.resolve(process.cwd(), "../npm/data/logs"),
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      scanAndWatchLogFiles(dir);
    }
  }

  // Try attaching to NPM Docker container logs if available
  attachDockerContainerWatcher().catch(() => {});
};

/**
 * Stops the NpmLogWatcher service
 */
const stop = () => {
  if (!isStarted) return;
  isStarted = false;

  if (cacheRefreshInterval) clearInterval(cacheRefreshInterval);
  if (flushInterval) clearInterval(flushInterval);

  for (const w of activeWatchers) {
    try {
      w.close();
    } catch {}
  }
  activeWatchers.length = 0;

  flushQueue().catch(() => {});
};

module.exports = {
  start,
  stop,
  parseLogLine,
  queueEntry,
  flushQueue,
  refreshHostnameCache,
};

