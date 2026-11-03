const os = require("os");
const { pool } = require("../config/database");
const dockerService = require("../docker/docker.service");
const diskService = require("./disk.service");

/**
 * Calculates overall CPU usage percentage based on tick differences.
 */
const getCpuUsage = () => {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return 0;
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  const totalUsed = totalTick - totalIdle;
  return totalTick > 0
    ? Math.min(100, Math.max(0, Math.round((totalUsed / totalTick) * 100)))
    : 0;
};

/**
 * Formats duration in seconds to a human-readable string (e.g. '3d 4h 12m 45s').
 */
const formatDuration = (seconds) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
};

/**
 * Gathers complete server health and telemetry metrics for super admin.
 */
const getServerHealth = async () => {
  // 1. Host System & Process
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);
  const memUsagePercent = totalMem
    ? Math.round((usedMem / totalMem) * 100)
    : 0;

  const processMem = process.memoryUsage();
  const uptimeSec = os.uptime();
  const procUptimeSec = Math.floor(process.uptime());

  // 2. Disk Space
  let diskData = null;
  try {
    const disk = await diskService.getDiskInfo();
    if (disk && disk.size) {
      const usedDisk = Math.max(0, disk.size - disk.free);
      diskData = {
        total: disk.size,
        free: disk.free,
        used: usedDisk,
        percentage: Math.round((usedDisk / disk.size) * 100),
        mount: disk.diskPath || "/",
      };
    }
  } catch (err) {
    console.warn("[Health] Failed to get disk metrics:", err.message);
  }

  // 3. PostgreSQL Database Health
  let dbData = {
    status: "unreachable",
    connected: false,
    latencyMs: null,
    version: null,
    activeConnections: 0,
    maxConnections: 100,
    dbSize: "Unknown",
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
    error: null,
  };

  try {
    const start = Date.now();
    await pool.query("SELECT 1;");
    const latency = Date.now() - start;

    const [verRes, connRes, sizeRes, maxRes] = await Promise.all([
      pool.query("SELECT version();").catch(() => ({ rows: [] })),
      pool
        .query(
          "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database();",
        )
        .catch(() => ({ rows: [{ count: 1 }] })),
      pool
        .query(
          "SELECT pg_size_pretty(pg_database_size(current_database())) as size;",
        )
        .catch(() => ({ rows: [{ size: "N/A" }] })),
      pool
        .query(
          "SELECT setting::int FROM pg_settings WHERE name = 'max_connections';",
        )
        .catch(() => ({ rows: [{ setting: 100 }] })),
    ]);

    let verStr = verRes.rows[0]?.version || "PostgreSQL";
    // Shorten version string (e.g. "PostgreSQL 15.4")
    const verMatch = verStr.match(/PostgreSQL\s+[\d\.]+/i);
    if (verMatch) verStr = verMatch[0];

    dbData = {
      status: "healthy",
      connected: true,
      latencyMs: latency,
      version: verStr,
      activeConnections: connRes.rows[0]?.count || 1,
      maxConnections: maxRes.rows[0]?.setting || 100,
      dbSize: sizeRes.rows[0]?.size || "N/A",
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      error: null,
    };
  } catch (err) {
    dbData.error = err.message;
  }

  // 4. Docker Container Engine
  let dockerData = {
    status: "offline",
    connected: false,
    serverVersion: null,
    containers: { total: 0, running: 0, paused: 0, stopped: 0 },
    images: 0,
    storageDriver: null,
    operatingSystem: null,
    error: null,
  };

  try {
    const isAlive = await dockerService.ping();
    if (isAlive) {
      const info = await dockerService.getInfo();
      dockerData = {
        status: "healthy",
        connected: true,
        serverVersion: info.ServerVersion || "Engine Active",
        containers: {
          total: info.Containers || 0,
          running: info.ContainersRunning || 0,
          paused: info.ContainersPaused || 0,
          stopped: info.ContainersStopped || 0,
        },
        images: info.Images || 0,
        storageDriver: info.Driver || "overlay2",
        operatingSystem: info.OperatingSystem || os.type(),
        error: null,
      };
    } else {
      dockerData.error = "Docker daemon is not responding to ping.";
    }
  } catch (err) {
    dockerData.error = err.message;
  }

  // 5. Port Allocation & Networking Telemetry
  let networkData = {
    portRange: "3001 - 3999",
    totalAllocatablePorts: 999,
    allocatedPorts: 0,
    freePorts: 999,
    utilizationPercent: 0,
  };

  if (dbData.connected) {
    try {
      const portQuery = await pool.query(
        "SELECT COUNT(*)::int AS count FROM deployments WHERE port IS NOT NULL AND LOWER(status) = 'running';",
      );
      const allocated = portQuery.rows[0]?.count || 0;
      networkData.allocatedPorts = allocated;
      networkData.freePorts = Math.max(0, 999 - allocated);
      networkData.utilizationPercent = Math.round((allocated / 999) * 100);
    } catch (err) {
      console.warn("[Health] Port query failed:", err.message);
    }
  }

  // 6. Overall Health Assessment
  const checks = [];

  if (dbData.connected) {
    checks.push({
      component: "Database",
      status: "pass",
      message: `PostgreSQL connection active (${dbData.latencyMs}ms latency)`,
    });
  } else {
    checks.push({
      component: "Database",
      status: "fail",
      message: `Database unreachable: ${dbData.error || "No connection"}`,
    });
  }

  if (dockerData.connected) {
    checks.push({
      component: "Container Engine",
      status: "pass",
      message: `Docker engine operational (${dockerData.containers.running} running containers)`,
    });
  } else {
    checks.push({
      component: "Container Engine",
      status: "warn",
      message: dockerData.error || "Docker daemon not responding",
    });
  }

  if (memUsagePercent > 92) {
    checks.push({
      component: "Memory",
      status: "warn",
      message: `High host memory usage (${memUsagePercent}%)`,
    });
  } else {
    checks.push({
      component: "Memory",
      status: "pass",
      message: `Memory capacity normal (${memUsagePercent}% used)`,
    });
  }

  if (diskData && diskData.percentage > 90) {
    checks.push({
      component: "Storage",
      status: "warn",
      message: `High disk storage utilization (${diskData.percentage}%)`,
    });
  } else if (diskData) {
    checks.push({
      component: "Storage",
      status: "pass",
      message: `Disk storage healthy (${diskData.percentage}% used)`,
    });
  }

  const hasFailures = checks.some((c) => c.status === "fail");
  const hasWarnings = checks.some((c) => c.status === "warn");
  const overallStatus = hasFailures
    ? "critical"
    : hasWarnings
      ? "degraded"
      : "healthy";

  return {
    overallStatus,
    timestamp: new Date().toISOString(),
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: uptimeSec,
      uptimeFormatted: formatDuration(uptimeSec),
      nodeVersion: process.version,
      pid: process.pid,
      processUptimeSeconds: procUptimeSec,
      processUptimeFormatted: formatDuration(procUptimeSec),
    },
    cpu: {
      model: os.cpus()[0]?.model || "Multi-Core CPU",
      cores: os.cpus().length,
      speedMhz: os.cpus()[0]?.speed || 0,
      usagePercent: getCpuUsage(),
      loadAverage: os.loadavg(),
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usagePercent: memUsagePercent,
      process: {
        rss: processMem.rss,
        heapTotal: processMem.heapTotal,
        heapUsed: processMem.heapUsed,
        external: processMem.external,
        heapPercent: processMem.heapTotal
          ? Math.round((processMem.heapUsed / processMem.heapTotal) * 100)
          : 0,
      },
    },
    disk: diskData,
    database: dbData,
    docker: dockerData,
    network: networkData,
    checks,
  };
};

module.exports = {
  getServerHealth,
};
