const fs = require("fs/promises");
const path = require("path");

const LOG_FILE = path.join(__dirname, "watchdog.log");

async function log(message) {
  const timestamp = new Date().toISOString();

  await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`);
}

module.exports = {
  log,
};
