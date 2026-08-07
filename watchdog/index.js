const { startScheduler } = require("./scheduler");

async function watchdogLoop() {
  console.log(`[${new Date().toISOString()}] Watchdog heartbeat`);
}

startScheduler(watchdogLoop, 30000); // every 30 seconds
