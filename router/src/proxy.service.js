const httpProxy = require("http-proxy");
const crypto = require("crypto");
const { pool } = require("./config/database");

const proxy = httpProxy.createProxyServer({});

// Anonymize IP
const hashIp = (ip) => {
  return crypto
    .createHash("sha256")
    .update(ip || "127.0.0.1")
    .digest("hex")
    .substring(0, 16);
};

// Handle proxy errors (e.g. target container down or restarting) to prevent router crashes
proxy.on("error", (err, req, res) => {
  console.error("[Proxy Error]:", err.message);

  if (res && !res.headersSent) {
    res.status(502).json({
      success: false,
      message: "Target application is currently unavailable or restarting.",
      error: err.code || err.message,
    });
  }
});

const recordTelemetry = (projectInfo, req, res, startHrTime) => {
  try {
    if (!projectInfo || !projectInfo.id) return;
    const diff = process.hrtime(startHrTime);
    const responseTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    const ipHash = hashIp(clientIp);
    const statusCode = res.statusCode || 200;
    const method = (req.method || "GET").slice(0, 10).toUpperCase();
    const reqPath = (req.originalUrl || req.url || "/").split("?")[0].slice(0, 500);
    const bytesSent = Number(res.getHeader("content-length")) || 0;

    pool
      .query(
        `INSERT INTO http_analytics (
          project_id, user_id, timestamp, status_code, response_time_ms, ip_hash, method, path, bytes_sent
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)`,
        [
          projectInfo.id,
          projectInfo.userId,
          statusCode,
          responseTimeMs,
          ipHash,
          method,
          reqPath,
          bytesSent,
        ],
      )
      .catch((err) => {
        console.warn("[Router Telemetry Notice]:", err.message);
      });
  } catch (err) {
    // Non-blocking telemetry
  }
};

const proxyRequest = (req, res, deployment, projectInfo = null) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    recordTelemetry(projectInfo, req, res, startHrTime);
  });

  // Support both local host development (localhost:port) and production Docker (containerName:containerPort)
  const targetHost =
    process.env.ROUTER_TARGET === "localhost"
      ? `localhost:${deployment.port}`
      : `${deployment.containerName}:${deployment.containerPort}`;

  const target = `http://${targetHost}`;

  console.log("[Proxy] Target:", target);

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
};

module.exports = {
  proxyRequest,
};
