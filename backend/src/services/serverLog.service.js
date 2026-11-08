const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");
const docker = require("../docker/docker.client");
const dockerService = require("../docker/docker.service");

// Circular in-memory log buffer
const MAX_IN_MEMORY_LOGS = 1500;
const inMemoryLogs = [];

let logCounter = 1;

/**
 * Adds an entry to the in-memory server log buffer
 */
const addServerLog = ({
  level = "info",
  source = "system",
  message = "",
  details = null,
  timestamp = null,
}) => {
  const entry = {
    id: `log_${Date.now()}_${logCounter++}`,
    timestamp: timestamp || new Date().toISOString(),
    level: level.toLowerCase(), // 'info' | 'warn' | 'error' | 'success'
    source: source.toLowerCase(), // 'system' | 'api' | 'audit' | 'deployment' | 'docker'
    message: String(message),
    details: details || null,
  };

  inMemoryLogs.unshift(entry);

  if (inMemoryLogs.length > MAX_IN_MEMORY_LOGS) {
    inMemoryLogs.pop();
  }

  return entry;
};

// Seed initial startup log
addServerLog({
  level: "info",
  source: "system",
  message: "EchoServer Server Logging Subsystem initialized and active.",
});

/**
 * Express middleware to record API access logs into server log buffer
 */
const sanitizeUrlForLogging = (url) => {
  if (!url || typeof url !== "string") return url;
  return url.replace(/([?&]token=)[^&#]+/gi, "$1[REDACTED]");
};

const requestLogger = (req, res, next) => {
  // Ignore health check probes and static assets to prevent log flooding
  if (
    req.path.startsWith("/api/server/health") ||
    req.path.startsWith("/api/server/logs") ||
    req.path.endsWith(".ico") ||
    req.path.endsWith(".map")
  ) {
    return next();
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    let level = "info";
    if (status >= 500) level = "error";
    else if (status >= 400) level = "warn";
    else if (status >= 200 && status < 300) level = "info";

    const sanitizedUrl = sanitizeUrlForLogging(req.originalUrl);

    addServerLog({
      level,
      source: "api",
      message: `${req.method} ${sanitizedUrl} - ${status} (${duration}ms)`,
      details: {
        method: req.method,
        path: sanitizedUrl,
        statusCode: status,
        durationMs: duration,
        ip: req.ip || req.socket?.remoteAddress,
      },
    });
  });

  next();
};

/**
 * Retrieves Docker containers list for log inspection
 */
const getDockerContainers = async () => {
  try {
    const isAlive = await dockerService.ping();
    if (!isAlive) return [];

    const containers = await docker.listContainers({ all: true });
    return containers.map((c) => ({
      id: c.Id.slice(0, 12),
      fullId: c.Id,
      name: (c.Names[0] || "").replace(/^\//, ""),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
    }));
  } catch (err) {
    console.warn("[ServerLogs] Docker container list unavailable:", err.message);
    return [];
  }
};

/**
 * Strips Docker multiplex protocol headers from stream chunks
 */
const cleanDockerLogChunk = (buffer) => {
  // Docker logs can have an 8-byte multiplex header: [streamType, 0, 0, 0, size1, size2, size3, size4]
  let str = "";
  let offset = 0;
  while (offset < buffer.length) {
    if (offset + 8 <= buffer.length && (buffer[offset] === 1 || buffer[offset] === 2)) {
      const size = buffer.readUInt32BE(offset + 4);
      const chunk = buffer.slice(offset + 8, offset + 8 + size);
      str += chunk.toString("utf8");
      offset += 8 + size;
    } else {
      str += buffer.slice(offset).toString("utf8");
      break;
    }
  }
  return str;
};

/**
 * Retrieves container stdout/stderr logs
 */
const getContainerLogs = async (containerId, tail = 250) => {
  try {
    const container = docker.getContainer(containerId);
    const logBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail: Number(tail) || 250,
      timestamps: true,
    });

    const rawStr = Buffer.isBuffer(logBuffer)
      ? cleanDockerLogChunk(logBuffer)
      : String(logBuffer);

    const lines = rawStr.split("\n").filter((l) => l.trim().length > 0);
    const parsedLogs = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Format: 2026-11-03T12:00:00.000000000Z message
      const parts = line.split(" ");
      const ts = parts[0];
      const msg = parts.slice(1).join(" ");

      let level = "info";
      const lower = msg.toLowerCase();
      if (lower.includes("error") || lower.includes("err") || lower.includes("fatal")) {
        level = "error";
      } else if (lower.includes("warn")) {
        level = "warn";
      } else if (lower.includes("success") || lower.includes("ready") || lower.includes("started")) {
        level = "success";
      }

      parsedLogs.push({
        id: `docker_${containerId}_${i}`,
        timestamp: ts || new Date().toISOString(),
        level,
        source: "docker",
        message: msg || line,
        details: { containerId },
      });
    }

    return parsedLogs.reverse(); // Most recent first
  } catch (err) {
    return [
      {
        id: `docker_err_${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: "error",
        source: "docker",
        message: `Failed to fetch container logs: ${err.message}`,
        details: { containerId, error: err.message },
      },
    ];
  }
};

/**
 * Retrieves database deployment logs
 */
const getDeploymentLogs = async (limit = 300) => {
  try {
    const result = await pool.query(
      `
      SELECT
        dl.id,
        dl.timestamp,
        dl.message,
        dl.deployment_id,
        p.id AS project_id,
        p.name AS project_name,
        u.username AS owner_username,
        COALESCE(d.status, 'unknown') AS deployment_status
      FROM deployment_logs dl
      JOIN deployments d ON d.id = dl.deployment_id
      JOIN projects p ON p.id = d.project_id
      LEFT JOIN users u ON u.id = p.owner_id
      ORDER BY dl.timestamp DESC
      LIMIT $1;
      `,
      [Number(limit) || 300],
    );

    return result.rows.map((row) => {
      let level = "info";
      const lowerMsg = (row.message || "").toLowerCase();
      if (lowerMsg.includes("error") || lowerMsg.includes("fail") || lowerMsg.includes("rejected")) {
        level = "error";
      } else if (lowerMsg.includes("warn")) {
        level = "warn";
      } else if (lowerMsg.includes("success") || lowerMsg.includes("healthy") || lowerMsg.includes("done")) {
        level = "success";
      }

      return {
        id: `dep_${row.id}`,
        timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
        level,
        source: "deployment",
        message: `[${row.project_name || "Project"}] ${row.message}`,
        details: {
          deploymentId: row.deployment_id,
          projectId: row.project_id,
          projectName: row.project_name,
          owner: row.owner_username,
          status: row.deployment_status,
        },
      };
    });
  } catch (err) {
    console.warn("[ServerLogs] Database deployment logs query failed:", err.message);
    return [];
  }
};

/**
 * Retrieves audit entries from users and configuration changes
 */
const getAuditLogs = async (limit = 50) => {
  try {
    const userRes = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        status,
        is_owner,
        created_at,
        updated_at
      FROM users
      ORDER BY updated_at DESC
      LIMIT $1;
      `,
      [Number(limit) || 50],
    );

    const logs = [];
    for (const u of userRes.rows) {
      logs.push({
        id: `audit_usr_${u.id}_upd`,
        timestamp: u.updated_at ? new Date(u.updated_at).toISOString() : new Date().toISOString(),
        level: u.status === "approved" ? "success" : u.status === "rejected" ? "warn" : "info",
        source: "audit",
        message: `User status record: '${u.username}' (${u.email}) is currently '${u.status}'${u.is_owner ? " [Owner]" : ""}`,
        details: { userId: u.id, username: u.username, email: u.email, status: u.status },
      });
    }

    return logs;
  } catch (err) {
    return [];
  }
};

/**
 * Reads watchdog log file if available
 */
const getWatchdogLogs = async () => {
  const watchdogPath = path.resolve(__dirname, "../../../watchdog/watchdog.log");
  if (!fs.existsSync(watchdogPath)) return [];

  try {
    const content = await fs.promises.readFile(watchdogPath, "utf8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-100).map((line, idx) => ({
      id: `wd_${idx}`,
      timestamp: new Date().toISOString(),
      level: line.includes("fail") ? "error" : line.includes("restart") ? "warn" : "info",
      source: "system",
      message: `[Watchdog] ${line}`,
      details: null,
    }));
  } catch {
    return [];
  }
};

/**
 * Main query method for Super Admin server logs
 */
const getServerLogs = async ({
  category = "all",
  level = "all",
  search = "",
  limit = 200,
  containerId = null,
}) => {
  const maxLimit = Math.min(1000, Math.max(10, Number(limit) || 200));
  let resultLogs = [];

  if (category === "docker" && containerId) {
    resultLogs = await getContainerLogs(containerId, maxLimit);
  } else if (category === "deployments") {
    resultLogs = await getDeploymentLogs(maxLimit);
  } else if (category === "audit") {
    resultLogs = await getAuditLogs(maxLimit);
  } else if (category === "api") {
    resultLogs = inMemoryLogs.filter((l) => l.source === "api");
  } else if (category === "system") {
    const wdLogs = await getWatchdogLogs();
    resultLogs = [...inMemoryLogs.filter((l) => l.source === "system"), ...wdLogs];
  } else {
    // "all" - Merge everything
    const [depLogs, auditLogs, wdLogs] = await Promise.all([
      getDeploymentLogs(100),
      getAuditLogs(30),
      getWatchdogLogs(),
    ]);

    resultLogs = [...inMemoryLogs, ...depLogs, ...auditLogs, ...wdLogs];

    // Sort descending by timestamp
    resultLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Filter by level if specified
  if (level && level !== "all") {
    const targetLevel = level.toLowerCase();
    resultLogs = resultLogs.filter((l) => l.level === targetLevel);
  }

  // Filter by search string if specified
  if (search && search.trim().length > 0) {
    const query = search.trim().toLowerCase();
    resultLogs = resultLogs.filter(
      (l) =>
        l.message.toLowerCase().includes(query) ||
        l.source.toLowerCase().includes(query) ||
        (l.details?.projectName && l.details.projectName.toLowerCase().includes(query)) ||
        (l.details?.path && l.details.path.toLowerCase().includes(query)),
    );
  }

  const totalAvailable = resultLogs.length;
  const returnedLogs = resultLogs.slice(0, maxLimit);

  return {
    logs: returnedLogs,
    totalCount: totalAvailable,
    limit: maxLimit,
    category,
    level,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Clears in-memory system/api logs
 */
const clearServerLogs = () => {
  const count = inMemoryLogs.length;
  inMemoryLogs.length = 0;
  addServerLog({
    level: "info",
    source: "system",
    message: "Server log buffer was cleared by Super Admin.",
  });
  return { clearedCount: count };
};

module.exports = {
  addServerLog,
  requestLogger,
  getDockerContainers,
  getContainerLogs,
  getServerLogs,
  clearServerLogs,
};
