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

function getDependents(containerName) {
  return CONTAINERS.filter((container) =>
    container.dependsOn.includes(containerName),
  );
}

async function waitUntilRunning(containerName, timeout = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await isContainerRunning(containerName)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

async function watchdogLoop() {
  try {
    const restartQueue = [];
    const processed = new Set();

    console.clear();

    console.log("===== Echo Watchdog =====\n");

    console.log("Core Services");

    for (const container of CONTAINERS) {
      const running = await isContainerRunning(container.name);

      if (running) {
        console.log("✓", container.name);
        continue;
      }

      console.log("✗", container.name);

      restartQueue.push(container);
    }

    while (restartQueue.length > 0) {
      const container = restartQueue.shift();

      if (processed.has(container.name)) {
        continue;
      }

      processed.add(container.name);

      console.log(`Restarting ${container.name}`);

      try {
        await restartContainer(container.name);

        console.log(`Waiting for ${container.name}...`);

        const healthy = await waitUntilRunning(container.name);

        if (!healthy) {
          console.log(`${container.name} failed to come online.`);
          await log(`${container.name} failed to become healthy.`);
          continue;
        }

        console.log(`${container.name} is running.`);

        await log(`${container.name} restarted successfully.`);

        const dependents = getDependents(container.name);

        for (const dependent of dependents) {
          if (!processed.has(dependent.name)) {
            restartQueue.push(dependent);
          }
        }
      } catch (err) {
        await log(`${container.name} restart FAILED`);
      }
    }

    const runningContainers = await getRunningContainers();

    console.log("\nUser Deployments");

    runningContainers
      .filter((c) => c.startsWith("echohub-"))
      .forEach((c) => console.log("•", c));
  } catch (err) {
    console.error(err);
  }
}

startScheduler(watchdogLoop, 30000);
