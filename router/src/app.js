const express = require("express");
const routerService = require("./router.service");
const proxyService = require("./proxy.service");

const app = express();
app.use(express.json());

// -----------------------------------------------------------------------------
// System Health and Internal Administration Endpoints
// -----------------------------------------------------------------------------
app.get("/_health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "echo-dynamic-router",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    cache: routerService.getCacheStats(),
  });
});

app.post("/_cache/clear", (req, res) => {
  routerService.clearCache();
  res.json({ success: true, message: "Router cache cleared." });
});

app.post("/_cache/invalidate", (req, res) => {
  const { hostname } = req.body || {};
  if (hostname) {
    routerService.invalidateHostname(hostname);
    return res.json({ success: true, message: `Cache invalidated for ${hostname}` });
  }
  routerService.clearCache();
  res.json({ success: true, message: "Full cache cleared." });
});

// -----------------------------------------------------------------------------
// ACME HTTP-01 Challenge Responder for Automated SSL/TLS
// -----------------------------------------------------------------------------
app.get("/.well-known/acme-challenge/:token", async (req, res) => {
  const token = req.params.token;
  if (!token) return res.status(404).send("Token required");

  try {
    const { pool } = require("./config/database");
    const { rows } = await pool.query(
      `SELECT key_authorization FROM acme_challenges WHERE token = $1 LIMIT 1`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).send("ACME challenge token not found or expired.");
    }

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(rows[0].key_authorization);
  } catch (err) {
    console.error("[ACME Challenge Error]:", err.message);
    return res.status(500).send("ACME verification error.");
  }
});

// -----------------------------------------------------------------------------
// Response Helper: Clean HTML Error Pages vs. API JSON
// -----------------------------------------------------------------------------
const renderError = (req, res, { status, badge, badgeClass, title, message }) => {
  const isHtml = (req.headers?.accept || "").includes("text/html");

  if (!isHtml) {
    return res.status(status).json({
      success: false,
      code: status,
      message,
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | EchoServer</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0d1117; color: #c9d1d9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 16px 36px rgba(0,0,0,0.5); }
    h1 { color: #f0f6fc; margin: 16px 0 10px 0; font-size: 24px; font-weight: 600; }
    p { color: #8b949e; line-height: 1.6; margin-bottom: 24px; font-size: 15px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(88,166,255,0.15); color: #58a6ff; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge.error { background: rgba(248,81,73,0.15); color: #f85149; }
    .badge.warning { background: rgba(210,153,34,0.15); color: #d29922; }
    .badge.info { background: rgba(56,139,253,0.15); color: #58a6ff; }
    .footer { margin-top: 24px; font-size: 12px; color: #484f58; border-top: 1px solid #21262d; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge ${badgeClass || "info"}">${badge || `HTTP ${status}`}</span>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="footer">EchoServer Dynamic Edge Router</div>
  </div>
</body>
</html>`;

  res.status(status).set("Content-Type", "text/html").send(html);
};

// -----------------------------------------------------------------------------
// Dynamic Hostname Proxy Middleware
// -----------------------------------------------------------------------------
app.use(async (req, res) => {
  try {
    const rawHost = req.headers.host;
    if (!rawHost) {
      return renderError(req, res, {
        status: 400,
        badge: "400 Bad Request",
        badgeClass: "error",
        title: "Host Header Missing",
        message: "Your browser or client did not provide an HTTP Host header.",
      });
    }

    // Safely strip ports and brackets (supporting IPv6 [::1]:port and domain:port)
    const host = rawHost.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").trim().toLowerCase();

    const project = await routerService.resolveHostname(host);

    if (!project) {
      return renderError(req, res, {
        status: 404,
        badge: "404 Not Found",
        badgeClass: "error",
        title: "Domain Not Found",
        message: `The requested domain <code>${host}</code> is not registered or is not active on this server.`,
      });
    }

    // Never deployed
    if (!project.deployment.containerName && !project.deployment.port) {
      return renderError(req, res, {
        status: 503,
        badge: "503 Deployment Pending",
        badgeClass: "warning",
        title: "Project Not Yet Deployed",
        message: `The project <strong>${project.project.name}</strong> has been configured, but has not completed its first deployment yet.`,
      });
    }

    // Deployment exists but container is stopped / not running
    if (project.deployment.status !== "running") {
      return renderError(req, res, {
        status: 503,
        badge: "503 Application Paused",
        badgeClass: "warning",
        title: "Application Is Paused",
        message: `The container for <strong>${project.project.name}</strong> is currently ${project.deployment.status || "stopped"}. Start the project from your EchoServer dashboard to bring it online.`,
      });
    }

    proxyService.proxyRequest(req, res, project.deployment, project.project);
  } catch (err) {
    console.error("[Router Internal Error]:", err);

    return renderError(req, res, {
      status: 500,
      badge: "500 Server Error",
      badgeClass: "error",
      title: "Router Error",
      message: "An internal error occurred while dispatching the request to the application container.",
    });
  }
});

module.exports = app;
