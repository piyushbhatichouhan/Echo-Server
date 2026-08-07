const { exec } = require("child_process");
const { promisify } = require("util");
const { log } = require("./logger");
const execAsync = promisify(exec);

async function getRunningContainers() {
  const { stdout } = await execAsync("docker ps --format '{{.Names}}'");

  return stdout
    .split("\n")
    .map((c) => c.trim())
    .filter(Boolean);
}

async function restartContainer(containerName) {
  console.log(`Restarting ${containerName}...`);
  await log(`Restarting ${containerName}`);
  await execAsync(`docker start ${containerName}`);
}

module.exports = {
  getRunningContainers,
  restartContainer,
};
