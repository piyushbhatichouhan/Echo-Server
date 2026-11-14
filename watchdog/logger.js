const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

const LOG_FILE = config.LOG_FILE_PATH || path.join(__dirname, "watchdog.log");
const MAX_LOG_SIZE = config.MAX_LOG_SIZE_BYTES || 5 * 1024 * 1024; // 5 MB

const rotateLogsIfNeeded = async () => {
  try {
    const stat = await fs.stat(LOG_FILE);
    if (stat.size >= MAX_LOG_SIZE) {
      const backupFile = `${LOG_FILE}.1`;
      await fs.rm(backupFile, { force: true }).catch(() => {});
      await fs.rename(LOG_FILE, backupFile).catch(() => {});
    }
  } catch {
    // File may not exist yet, ignore
  }
};

async function log(message) {
  try {
    await rotateLogsIfNeeded();
    const timestamp = new Date().toISOString();
    await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error("[Watchdog Logger Warning]:", err.message);
  }
}

module.exports = {
  log,
};
