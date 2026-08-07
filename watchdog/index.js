const { startScheduler } = require("./scheduler");
const { getRunningContainers } = require("./docker");

async function watchdogLoop() {
  try {
    const containers = await getRunningContainers();

    console.clear();

    console.log("Running Containers");
    console.log("------------------");

    containers.forEach((container) => {
      console.log("✓", container);
    });

    console.log("\nTotal:", containers.length);
  } catch (err) {
    console.error("Docker Error");
    console.error(err.message);
  }
}

startScheduler(watchdogLoop, 30000);
