require("dotenv").config();

const http = require("http");
const https = require("https");
const tls = require("tls");
const app = require("./src/app");
const routerService = require("./src/router.service");
const proxyService = require("./src/proxy.service");
const routerRepository = require("./src/router.repository");
const { generateCertificate } = require("./src/cert.generator");
const { connectDatabase, closeDatabase } = require("./src/config/database");

const HTTP_PORT = Number(process.env.PORT) || 8080;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 8443;
const ENABLE_HTTPS_REDIRECT = process.env.ENABLE_HTTPS_REDIRECT === "true";

// -----------------------------------------------------------------------------
// In-Memory TLS SecureContext Cache with SNI Dynamic Resolution
// -----------------------------------------------------------------------------
const tlsCache = new Map();

// Generate valid fallback X.509 certificate for unknown domains during TLS handshake
let fallbackContext = null;
try {
  const { certificate, privateKey } = generateCertificate("localhost", 365);
  fallbackContext = tls.createSecureContext({ cert: certificate, key: privateKey });
} catch (err) {
  console.warn("[Router TLS] Fallback context warning:", err.message);
}

const resolveSecureContext = async (servername) => {
  if (!servername) return fallbackContext;
  const host = servername.trim().toLowerCase();

  const cached = tlsCache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ctx;
  }

  try {
    const certRecord = await routerRepository.getCertificateByHostname(host);
    if (certRecord && certRecord.certificate && certRecord.private_key) {
      const ctx = tls.createSecureContext({
        cert: certRecord.certificate,
        key: certRecord.private_key,
      });

      tlsCache.set(host, {
        ctx,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
      });

      return ctx;
    }
  } catch (err) {
    console.warn(`[Router TLS] Failed to load certificate for ${host}:`, err.message);
  }

  return fallbackContext;
};

(async () => {
  try {
    console.log("Connecting to PostgreSQL database...");
    await connectDatabase();

    // -------------------------------------------------------------------------
    // HTTP App with Optional HTTPS Redirect (Preserving ACME Challenge)
    // -------------------------------------------------------------------------
    const httpApp = (req, res) => {
      // Allow ACME challenges to proceed over HTTP without redirect
      if (req.url.startsWith("/.well-known/acme-challenge/")) {
        return app(req, res);
      }

      if (ENABLE_HTTPS_REDIRECT) {
        const rawHost = req.headers.host || "localhost";
        const host = rawHost.replace(/:\d+$/, "");
        const redirectUrl = `https://${host}${HTTPS_PORT === 443 ? "" : `:${HTTPS_PORT}`}${req.url}`;
        res.writeHead(301, { Location: redirectUrl });
        return res.end();
      }

      return app(req, res);
    };

    const httpServer = http.createServer(httpApp);

    // -------------------------------------------------------------------------
    // HTTPS Server with Dynamic SNI Certificate Resolution
    // -------------------------------------------------------------------------
    const httpsServer = https.createServer(
      {
        SNICallback: async (servername, cb) => {
          try {
            const ctx = await resolveSecureContext(servername);
            cb(null, ctx);
          } catch (e) {
            cb(e, fallbackContext);
          }
        },
      },
      app,
    );

    // -------------------------------------------------------------------------
    // Shared WebSocket & Upgrade Handler
    // -------------------------------------------------------------------------
    const handleUpgrade = async (req, socket, head) => {
      try {
        const rawHost = req.headers.host;
        if (!rawHost) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          socket.destroy();
          return;
        }

        const host = rawHost.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").trim().toLowerCase();
        const project = await routerService.resolveHostname(host);

        if (!project || !project.deployment || project.deployment.status !== "running") {
          socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
          socket.destroy();
          return;
        }

        proxyService.proxyWebSocket(req, socket, head, project.deployment, project.project);
      } catch (err) {
        console.warn("[Router WS Upgrade Error]:", err.message);
        try {
          socket.destroy();
        } catch (_) {}
      }
    };

    httpServer.on("upgrade", handleUpgrade);
    httpsServer.on("upgrade", handleUpgrade);

    httpServer.listen(HTTP_PORT, () => {
      console.log(`🚀 Echo Edge Router (HTTP) listening on port ${HTTP_PORT}`);
    });

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`🔒 Echo Edge Router (HTTPS/TLS) listening on port ${HTTPS_PORT}`);
    });

    // -------------------------------------------------------------------------
    // Graceful Shutdown & Connection Draining
    // -------------------------------------------------------------------------
    const handleShutdown = async (signal) => {
      console.log(`\n[Router] Received ${signal}. Draining connections...`);
      httpServer.close(() => {});
      httpsServer.close(async () => {
        console.log("[Router] HTTP/HTTPS servers closed.");
        try {
          await proxyService.flushTelemetry();
          await closeDatabase();
        } catch (e) {
          console.warn("[Router Shutdown Warning]:", e.message);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error("[Router] Forcing exit after drain timeout.");
        process.exit(1);
      }, 8000).unref();
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  } catch (err) {
    console.error("Fatal Router Startup Error:", err);
    process.exit(1);
  }
})();
