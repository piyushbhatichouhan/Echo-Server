require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const routerService = require("./src/router.service");
const proxyService = require("./src/proxy.service");
const { connectDatabase, closeDatabase } = require("./src/config/database");

const PORT = Number(process.env.PORT) || 8080;

(async () => {
  try {
    console.log("Connecting to PostgreSQL database...");
    await connectDatabase();

    const server = http.createServer(app);

    // -------------------------------------------------------------------------
    // WebSocket & HTTP Upgrade Forwarding
    // -------------------------------------------------------------------------
    server.on("upgrade", async (req, socket, head) => {
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
    });

    server.listen(PORT, () => {
      console.log(`🚀 Echo Dynamic Edge Router listening on port ${PORT}`);
    });

    // -------------------------------------------------------------------------
    // Graceful Shutdown & Connection Draining
    // -------------------------------------------------------------------------
    const handleShutdown = async (signal) => {
      console.log(`\n[Router] Received ${signal}. Draining connections...`);
      server.close(async () => {
        console.log("[Router] HTTP server closed.");
        try {
          await proxyService.flushTelemetry();
          await closeDatabase();
        } catch (e) {
          console.warn("[Router Shutdown Warning]:", e.message);
        }
        process.exit(0);
      });

      // Force terminate if sockets do not drain within 8 seconds
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
