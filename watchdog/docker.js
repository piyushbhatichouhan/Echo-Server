const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function getRunningContainers() {
  const { stdout } = await execAsync("docker ps --format '{{.Names}}'");

  return stdout
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);
}

module.exports = {
  getRunningContainers,
};
