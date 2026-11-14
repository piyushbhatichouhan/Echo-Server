const path = require("path");

module.exports = {
  CHECK_INTERVAL_MS: Number(process.env.WATCHDOG_INTERVAL_MS) || 30000,
  STARTUP_GRACE_PERIOD_MS: Number(process.env.WATCHDOG_GRACE_PERIOD_MS) || 0,
  MAX_CONSECUTIVE_FAILURES: 3,
  CIRCUIT_BREAKER_RESET_MS: 5 * 60 * 1000, // 5 minutes
  CONTAINER_WAIT_TIMEOUT_MS: 45000, // 45 seconds
  LOG_FILE_PATH: path.join(__dirname, "watchdog.log"),
  MAX_LOG_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  REQUIRED_CONTAINERS: [
    "echo-postgres",
    "echo-backend",
    "echo-router",
    "echo-frontend",
  ],
};
