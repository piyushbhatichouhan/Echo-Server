require("dotenv").config();

const app = require("./app");
const { connectDatabase } = require("./config/database");
const { validateStartup } = require("./startup/validator");

const PORT = process.env.PORT || 3000;

// Global process error sentinel handlers
process.on("uncaughtException", (error) => {
  console.error("[CRITICAL] Uncaught Exception:", error);
  try {
    const { addServerLog } = require("./services/serverLog.service");
    addServerLog({
      level: "error",
      source: "system",
      message: `Uncaught Exception: ${error?.message || error}`,
      details: { stack: error?.stack },
    });
  } catch (_) {}

  try {
    const notificationService = require("./services/notification.service");
    notificationService
      .notifyCriticalError({
        error,
        source: "Node.js Process (Uncaught Exception)",
      })
      .catch(() => {});
  } catch (_) {}
});

process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Unhandled Promise Rejection:", reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  try {
    const { addServerLog } = require("./services/serverLog.service");
    addServerLog({
      level: "error",
      source: "system",
      message: `Unhandled Rejection: ${error.message}`,
      details: { stack: error.stack },
    });
  } catch (_) {}

  try {
    const notificationService = require("./services/notification.service");
    notificationService
      .notifyCriticalError({
        error,
        source: "Node.js Process (Unhandled Rejection)",
      })
      .catch(() => {});
  } catch (_) {}
});

const startServer = async () => {
  try {
    console.log("🚀 Starting Echo API...");
    console.log("🔄 Connecting to PostgreSQL...");

    await connectDatabase();
    await validateStartup();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port, helloooo ${PORT}`);
    });
  } catch (err) {
    console.error("💥 Fatal startup failure:", err);
    try {
      const notificationService = require("./services/notification.service");
      await notificationService.notifyCriticalError({
        error: err,
        source: "Server Startup Validation Failure",
      });
    } catch (_) {}
    process.exit(1);
  }
};

startServer();
