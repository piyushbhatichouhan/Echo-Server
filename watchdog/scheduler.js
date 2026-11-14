const config = require("./config");

let timer = null;
let isExecuting = false;

const startScheduler = (task, intervalMs = config.CHECK_INTERVAL_MS, startupDelayMs = config.STARTUP_GRACE_PERIOD_MS) => {
  const runCycle = async () => {
    if (isExecuting) {
      console.log("[Watchdog Scheduler] Previous inspection cycle is still running. Skipping overlapping trigger.");
      return;
    }

    isExecuting = true;
    try {
      await task();
    } catch (err) {
      console.error("[Watchdog Scheduler Loop Error]:", err);
    } finally {
      isExecuting = false;
      // Schedule next run only AFTER current task completes
      timer = setTimeout(runCycle, intervalMs);
    }
  };

  if (startupDelayMs > 0) {
    console.log(`[Watchdog] Waiting ${Math.round(startupDelayMs / 1000)}s initial grace period before starting monitoring...`);
    timer = setTimeout(runCycle, startupDelayMs);
  } else {
    runCycle();
  }
};

const stopScheduler = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

module.exports = {
  startScheduler,
  stopScheduler,
};
