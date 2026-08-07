const { startScheduler } = require("./scheduler");
const { getRunningContainers, restartContainer } = require("./docker");
const CONTAINERS = require("./containers");
const { log } = require("./logger");

async function isContainerRunning(name) {
  const running = await getRunningContainers();
  return running.includes(name);
}

async function dependenciesSatisfied(container) {
  for (const dependency of container.dependsOn) {
    const running = await isContainerRunning(dependency);

    if (!running) {
      return false;
    }
  }

  return true;
}

async function watchdogLoop() {
  try {
    const running = await getRunningContainers();

    console.clear();

    console.log("===== Echo Watchdog =====\n");

    console.log("Core Services");

    for (const container of CONTAINERS) {
      if (!(await dependenciesSatisfied(container))) {
        console.log(`Waiting for dependencies of ${container.name}`);
        continue;
      }

      if (running.includes(container.name)) {
        console.log("✓", container.name);
      } else {
        console.log("✗", container.name, "(NOT RUNNING)");

        try {
          await restartContainer(container.name);

          console.log("↳ Restart command sent");
          await log("↳ Restart command sent");
        } catch (err) {
          console.log("↳ Failed:", err.message);
          await log(`${container.name} restart FAILED : ${err.message}`);
        }
      }
    }

    console.log("\nUser Deployments");

    running
      .filter((c) => c.startsWith("echohub-"))
      .forEach((c) => console.log("•", c));
  } catch (err) {
    console.error(err);
  }
}

startScheduler(watchdogLoop, 30000);
