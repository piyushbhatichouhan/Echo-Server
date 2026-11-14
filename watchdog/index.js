const os = require("os");
const config = require("./config");
const { startScheduler, stopScheduler } = require("./scheduler");
const { getContainerMap, restartContainer } = require("./docker");
const CONTAINERS = require("./containers");
const { log } = require("./logger");

// Circuit breaker state maps
const consecutiveFailures = new Map();
const circuitBreakers = new Map();

/**
 * Checks if all required upstream dependencies for a container are currently running.
 */
function dependenciesSatisfied(container, containerMap) {
  for (const depName of container.dependsOn) {
    const depInfo = containerMap.get(depName);
    if (!depInfo || !depInfo.running) {
      return false;
    }
  }
  return true;
}

/**
 * Returns containers that depend on a given container name.
 */
function getDependents(containerName) {
  return CONTAINERS.filter((container) =>
    container.dependsOn.includes(containerName),
  );
}

/**
 * Polls Docker until a container reaches running state or timeout expires.
 */
async function waitUntilRunning(containerName, timeoutMs = config.CONTAINER_WAIT_TIMEOUT_MS) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const currentMap = await getContainerMap();
    const info = currentMap.get(containerName);
    if (info && info.running) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return false;
}

/**
 * Checks host memory and emits alerts if free RAM is critically depleted.
 */
async function checkHostHealth() {
  const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
  const freePercent = (freeMemMB / totalMemMB) * 100;

  if (freeMemMB < 150 || freePercent < 5) {
    const alertMsg = `[Host Resource Alert] Low memory warning: ${freeMemMB}MB free of ${totalMemMB}MB (${freePercent.toFixed(1)}%)`;
    console.warn(`⚠️  ${alertMsg}`);
    await log(alertMsg);
  }
}

/**
 * Core Watchdog Evaluation Loop
 */
async function watchdogLoop() {
  try {
    const now = Date.now();

    // Clean output for interactive TTYs while keeping journalctl logs clean
    if (process.stdout.isTTY && process.env.NODE_ENV !== "production") {
      console.clear();
    }

    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n===== Echo Watchdog [${timestamp}] =====`);

    // 1. Check host resources
    await checkHostHealth();

    // 2. Query all containers in a single-pass CLI call
    let containerMap = await getContainerMap();

    console.log("\nCore Services Status:");

    const restartQueue = [];

    // 3. Evaluate core containers
    for (const container of CONTAINERS) {
      const info = containerMap.get(container.name);
      const isRunning = info && info.running;

      if (isRunning) {
        // Reset failure tracking on healthy container
        consecutiveFailures.delete(container.name);
        circuitBreakers.delete(container.name);
        console.log(`  ✓ ${container.name} (${info.status || "healthy"})`);
        continue;
      }

      console.log(`  ✗ ${container.name} (${info ? info.state : "not created"})`);

      // Circuit Breaker check
      const breakerUntil = circuitBreakers.get(container.name);
      if (breakerUntil && breakerUntil > now) {
        const remainingSec = Math.round((breakerUntil - now) / 1000);
        console.log(`    ⚠️ Circuit breaker active for ${container.name} (${remainingSec}s remaining before retry)`);
        continue;
      }

      restartQueue.push(container);
    }

    const processed = new Set();

    // 4. Process restart queue with dependency ordering & circuit breakers
    while (restartQueue.length > 0) {
      const container = restartQueue.shift();

      if (processed.has(container.name)) continue;
      processed.add(container.name);

      // Verify that all prerequisite dependencies are up first
      if (!dependenciesSatisfied(container, containerMap)) {
        console.log(`  ⏳ Skipping ${container.name}: Prerequisite dependencies (${container.dependsOn.join(", ")}) not running yet.`);
        continue;
      }

      console.log(`\n[Recovery] Initiating restart of ${container.name}...`);
      await log(`Attempting restart of core container: ${container.name}`);

      const result = await restartContainer(container.name);

      if (result.success) {
        console.log(`[Recovery] Waiting for ${container.name} to confirm running state...`);
        const healthy = await waitUntilRunning(container.name);

        if (healthy) {
          console.log(`[Recovery] ✓ ${container.name} is confirmed online and running.`);
          await log(`Core service ${container.name} recovered successfully.`);

          consecutiveFailures.delete(container.name);
          circuitBreakers.delete(container.name);

          // Update local map to reflect the newly running container
          containerMap = await getContainerMap();

          // Only queue dependent services if they are currently down
          const dependents = getDependents(container.name);
          for (const dep of dependents) {
            const depInfo = containerMap.get(dep.name);
            if ((!depInfo || !depInfo.running) && !processed.has(dep.name)) {
              console.log(`[Recovery] Queuing stopped dependent service: ${dep.name}`);
              restartQueue.push(dep);
            }
          }
          continue;
        }
      }

      // Handle Failure & Circuit Breaker Increment
      const currentFailures = (consecutiveFailures.get(container.name) || 0) + 1;
      consecutiveFailures.set(container.name, currentFailures);

      console.error(`[Recovery] ✗ ${container.name} failed to come online (Failure ${currentFailures}/${config.MAX_CONSECUTIVE_FAILURES}).`);
      await log(`Core service ${container.name} failed to become healthy (Attempt ${currentFailures}).`);

      if (currentFailures >= config.MAX_CONSECUTIVE_FAILURES) {
        const resetAt = Date.now() + config.CIRCUIT_BREAKER_RESET_MS;
        circuitBreakers.set(container.name, resetAt);
        const breakerMsg = `[Circuit Breaker] ${container.name} failed ${currentFailures} consecutive restart attempts. Pausing restarts for 5 minutes.`;
        console.error(`🛑 ${breakerMsg}`);
        await log(breakerMsg);
      }
    }

    // 5. Inspect user application deployments (telemetry & crash detection)
    console.log("\nUser Deployments:");
    let userActiveCount = 0;
    let userCrashedCount = 0;

    for (const [name, info] of containerMap.entries()) {
      if (name.startsWith("echoserver-") || name.startsWith("echohub-")) {
        if (info.running) {
          userActiveCount++;
          console.log(`  • [RUNNING] ${name} (${info.status})`);
        } else if (info.state === "exited" || info.state === "dead") {
          // Detect abnormal exits (e.g. exit code != 0, OOM killed)
          const isAbnormalExit = !info.status.includes("Exited (0)");
          if (isAbnormalExit) {
            userCrashedCount++;
            console.log(`  ⚠️ [TERMINATED] ${name} (${info.status})`);
            await log(`User container crashed/terminated: ${name} (${info.status})`);
          }
        }
      }
    }

    if (userActiveCount === 0 && userCrashedCount === 0) {
      console.log("  (No active tenant deployment containers)");
    } else {
      console.log(`  Summary: ${userActiveCount} running, ${userCrashedCount} crashed/terminated`);
    }

  } catch (err) {
    console.error("[Watchdog Loop Exception]:", err);
    await log(`Watchdog unhandled error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Initialization & Signal Handling
// -----------------------------------------------------------------------------
console.log("Starting Echo Watchdog Service...");
startScheduler(watchdogLoop, config.CHECK_INTERVAL_MS, config.STARTUP_GRACE_PERIOD_MS);

const handleShutdown = (signal) => {
  console.log(`\n[Watchdog] Received ${signal}. Shutting down cleanly...`);
  stopScheduler();
  process.exit(0);
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
