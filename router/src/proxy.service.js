const httpProxy = require("http-proxy");
const crypto = require("crypto");
const { pool } = require("./config/database");

const proxy = httpProxy.createProxyServer({
  ws: true,
  xfwd: true,
  timeout: Number(process.env.ROUTER_TIMEOUT_MS) || 30000,
  proxyTimeout: Number(process.env.ROUTER_PROXY_TIMEOUT_MS) || 30000,
});

// Anonymize IP via SHA-256 (first 16 chars)
const hashIp = (ip) => {
  return crypto
    .createHash("sha256")
    .update(ip || "127.0.0.1")
    .digest("hex")
    .substring(0, 16);
};

// Handle proxy errors safely for both standard HTTP responses and raw TCP WebSockets
proxy.on("error", (err, req, res) => {
  console.warn(`[Proxy Notice] Upstream request failed (${err.code || err.message}) for host: ${req?.headers?.host || "unknown"}`);

  // HTTP response
  if (res && typeof res.status === "function" && !res.headersSent) {
    const isHtml = (req.headers?.accept || "").includes("text/html");
    if (isHtml) {
      res.status(502).set("Content-Type", "text/html").send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>502 - Application Unavailable</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
            h1 { color: #f85149; margin-top: 0; font-size: 26px; }
            p { color: #8b949e; line-height: 1.6; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 4px 10px; background: rgba(248,81,73,0.15); color: #f85149; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
            .retry-btn { display: inline-block; padding: 10px 24px; background: #238636; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer; border: none; }
            .retry-btn:hover { background: #2ea043; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">502 Bad Gateway</span>
            <h1>Application Unavailable</h1>
            <p>The container for this application is currently starting, restarting, or failed to respond. Please try again in a few moments.</p>
            <button class="retry-btn" onclick="window.location.reload()">Reload Application</button>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(502).json({
        success: false,
        message: "Target application is currently unavailable or restarting.",
        error: err.code || err.message,
      });
    }
  } else if (res && typeof res.destroy === "function") {
    // Raw socket (WebSocket / HTTP Upgrade error)
    res.destroy();
  }
});

// -----------------------------------------------------------------------------
// Buffered Telemetry Batching Queue
// -----------------------------------------------------------------------------
let telemetryBuffer = [];
const BATCH_FLUSH_INTERVAL_MS = 2000;
const MAX_BATCH_SIZE = 50;

const flushTelemetry = async () => {
  if (telemetryBuffer.length === 0) return;

  const recordsToFlush = telemetryBuffer.splice(0, telemetryBuffer.length);
  try {
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const r of recordsToFlush) {
      valueClauses.push(
        `($${pIdx++}, $${pIdx++}, NOW(), $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
      );
      params.push(
        r.projectId,
        r.userId,
        r.statusCode,
        r.responseTimeMs,
        r.ipHash,
        r.method,
        r.path,
        r.bytesSent,
      );
    }

    const queryText = `
      INSERT INTO http_analytics (
        project_id, user_id, timestamp, status_code, response_time_ms, ip_hash, method, path, bytes_sent
      ) VALUES ${valueClauses.join(", ")}
    `;

    await pool.query(queryText, params);
  } catch (err) {
    console.warn("[Router Telemetry Flush Notice]:", err.message);
  }
};

const telemetryTimer = setInterval(flushTelemetry, BATCH_FLUSH_INTERVAL_MS);
telemetryTimer.unref();

const queueTelemetry = (projectInfo, req, res, startHrTime, initialBytesWritten = 0) => {
  try {
    if (!projectInfo || !projectInfo.id) return;
    const diff = process.hrtime(startHrTime);
    const responseTimeMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const ipHash = hashIp(clientIp);
    const statusCode = res.statusCode || 200;
    const method = (req.method || "GET").slice(0, 10).toUpperCase();
    const reqPath = (req.originalUrl || req.url || "/").split("?")[0].slice(0, 500);

    // Compute actual bytes sent: inspect socket delta or fallback to content-length
    let bytesSent = 0;
    if (res.socket && typeof res.socket.bytesWritten === "number") {
      bytesSent = Math.max(0, res.socket.bytesWritten - initialBytesWritten);
    }
    if (bytesSent === 0) {
      bytesSent = Number(res.getHeader("content-length")) || 0;
    }

    telemetryBuffer.push({
      projectId: projectInfo.id,
      userId: projectInfo.userId,
      statusCode,
      responseTimeMs,
      ipHash,
      method,
      path: reqPath,
      bytesSent,
    });

    if (telemetryBuffer.length >= MAX_BATCH_SIZE) {
      flushTelemetry().catch(() => {});
    }
  } catch (err) {
    // Non-blocking telemetry
  }
};

const resolveCandidateTargets = (deployment) => {
  const candidates = [];
  const containerName = deployment.containerName;
  const containerPort = Number(deployment.containerPort) || 3000;
  const hostPort = Number(deployment.port) || containerPort;

  // 1. If explicit localhost mode, prioritize localhost
  if (process.env.ROUTER_TARGET === "localhost") {
    candidates.push(`http://127.0.0.1:${hostPort}`);
    if (containerName && isNaN(Number(containerName))) {
      candidates.push(`http://${containerName}:${containerPort}`);
    }
    return candidates;
  }

  // 2. In container/production mode:
  // First try direct container DNS name if valid string (not purely numeric like "3000")
  if (containerName && isNaN(Number(containerName))) {
    candidates.push(`http://${containerName}:${containerPort}`);
  }

  // Fallbacks: host-mapped port via host.docker.internal, Docker bridge gateway IP, or 127.0.0.1
  if (hostPort) {
    candidates.push(`http://host.docker.internal:${hostPort}`);
    candidates.push(`http://172.17.0.1:${hostPort}`);
    candidates.push(`http://127.0.0.1:${hostPort}`);
  }

  return candidates.length > 0 ? candidates : [`http://127.0.0.1:${hostPort || 3000}`];
};

const resolveTarget = (deployment) => {
  const candidates = resolveCandidateTargets(deployment);
  return candidates[0];
};

const proxyRequest = (req, res, deployment, projectInfo = null) => {
  const startHrTime = process.hrtime();
  const initialBytesWritten = res.socket?.bytesWritten || 0;

  res.on("finish", () => {
    queueTelemetry(projectInfo, req, res, startHrTime, initialBytesWritten);
  });

  const candidates = resolveCandidateTargets(deployment);
  let candidateIndex = 0;

  const tryProxy = (target) => {
    proxy.web(
      req,
      res,
      {
        target,
        changeOrigin: true,
        xfwd: true,
        headers: {
          "X-Forwarded-Host": req.headers.host || "",
          "X-Forwarded-Proto":
            req.headers["x-forwarded-proto"] ||
            (req.socket?.encrypted ? "https" : "http"),
          "X-Real-IP":
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            "127.0.0.1",
        },
      },
      (err) => {
        candidateIndex++;
        if (candidateIndex < candidates.length && !res.headersSent) {
          console.warn(
            `[Proxy Notice] Upstream ${target} unreachable (${err.code || err.message}). Retrying fallback ${candidates[candidateIndex]}...`
          );
          tryProxy(candidates[candidateIndex]);
        } else if (res && !res.headersSent && typeof res.status === "function") {
          const isHtml = (req.headers?.accept || "").includes("text/html");
          if (isHtml) {
            res.status(502).set("Content-Type", "text/html").send(`
              <!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="utf-8">
                <title>502 - Application Unavailable</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                  .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
                  h1 { color: #f85149; margin-top: 0; font-size: 26px; }
                  p { color: #8b949e; line-height: 1.6; margin-bottom: 24px; }
                  .badge { display: inline-block; padding: 4px 10px; background: rgba(248,81,73,0.15); color: #f85149; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
                  .retry-btn { display: inline-block; padding: 10px 24px; background: #238636; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; cursor: pointer; border: none; }
                  .retry-btn:hover { background: #2ea043; }
                </style>
              </head>
              <body>
                <div class="card">
                  <span class="badge">502 Bad Gateway</span>
                  <h1>Application Unavailable</h1>
                  <p>The container for this application is currently starting, restarting, or failed to respond. Please try again in a few moments.</p>
                  <button class="retry-btn" onclick="window.location.reload()">Reload Application</button>
                </div>
              </body>
              </html>
            `);
          } else {
            res.status(502).json({
              success: false,
              message: "Target application is currently unavailable or restarting.",
              error: err.code || err.message,
            });
          }
        }
      },
    );
  };

  tryProxy(candidates[0]);
};

const proxyWebSocket = (req, socket, head, deployment, projectInfo = null) => {
  const target = resolveTarget(deployment);

  proxy.ws(req, socket, head, {
    target,
    changeOrigin: true,
    xfwd: true,
  });
};

module.exports = {
  proxyRequest,
  proxyWebSocket,
  flushTelemetry,
};
