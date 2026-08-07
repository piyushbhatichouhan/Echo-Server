const { startScheduler } = require("./scheduler");
const { getRunningContainers, restartContainer } = require("./docker");
const { REQUIRED_CONTAINERS } = require("./config");
const { log } = require("./logger");

async function watchdogLoop() {
  try {
    const running = await getRunningContainers();

    console.clear();

    console.log("===== Echo Watchdog =====\n");

    console.log("Core Services");

    for (const container of REQUIRED_CONTAINERS) {
      if (running.includes(container)) {
        console.log("✓", container);
      } else {
        console.log("✗", container, "(NOT RUNNING)");

        try {
          await restartContainer(container);

          console.log("↳ Restart command sent");
          await log("↳ Restart command sent");
        } catch (err) {
          console.log("↳ Failed:", err.message);
          await log(`${container} restart FAILED : ${err.message}`);
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
