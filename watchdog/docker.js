const { execFile } = require("child_process");
const { promisify } = require("util");
const { log } = require("./logger");
const execFileAsync = promisify(execFile);

/**
 * Fetches all containers (running and stopped) in a single CLI call.
 * Returns a Map of containerName -> { name, state, status, running }
 */
async function getContainerMap() {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "-a",
      "--format",
      "{{.Names}}\t{{.State}}\t{{.Status}}",
    ]);

    const map = new Map();
    const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      const parts = line.split("\t");
      const names = parts[0]?.split(",") || [];
      const state = (parts[1] || "").toLowerCase();
      const status = parts[2] || "";

      for (const rawName of names) {
        const name = rawName.trim().replace(/^\//, "");
        if (name) {
          map.set(name, {
            name,
            state,
            status,
            running: state === "running",
          });
        }
      }
    }

    return map;
  } catch (err) {
    console.error("[Watchdog Docker Error]: Failed to query Docker:", err.message);
    return new Map();
  }
}

async function getRunningContainers() {
  const map = await getContainerMap();
  const running = [];
  for (const [name, info] of map.entries()) {
    if (info.running) running.push(name);
  }
  return running;
}

async function restartContainer(containerName) {
  console.log(`Restarting ${containerName}...`);
  await log(`Restarting ${containerName}`);
  try {
    // docker restart restarts running or starts stopped containers with 10s grace period
    await execFileAsync("docker", ["restart", "-t", "10", containerName]);
    return { success: true };
  } catch (err) {
    console.error(`[Watchdog] Error restarting ${containerName}:`, err.message);
    await log(`Failed to restart ${containerName}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getContainerMap,
  getRunningContainers,
  restartContainer,
};
