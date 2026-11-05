const crypto = require("crypto");
const analyticsRepo = require("../repositories/analytics.repository");
const { pool } = require("../config/database");

/**
 * Generates an anonymized pseudo IP hash.
 */
const hashIp = (ip) => {
  return crypto.createHash("sha256").update(ip || "127.0.0.1").digest("hex").substring(0, 16);
};

/**
 * Creates realistic sample traffic data for a project across past 30 days.
 */
const generateSampleTraffic = (projectId, userId, totalPoints = 150) => {
  const samplePaths = [
    { path: "/", method: "GET", weight: 35 },
    { path: "/api/health", method: "GET", weight: 20 },
    { path: "/api/data", method: "GET", weight: 15 },
    { path: "/api/user/profile", method: "GET", weight: 10 },
    { path: "/static/bundle.js", method: "GET", weight: 10 },
    { path: "/api/auth/login", method: "POST", weight: 5 },
    { path: "/not-found-page", method: "GET", weight: 3 },
    { path: "/api/compute", method: "POST", weight: 2 },
  ];

  const ipPool = [
    "192.168.1.101",
    "10.0.0.45",
    "172.16.4.12",
    "198.51.100.8",
    "203.0.113.19",
    "198.51.100.42",
    "192.0.2.146",
    "172.20.10.3",
    "10.10.50.21",
    "192.168.10.88",
  ].map(hashIp);

  const records = [];
  const now = Date.now();

  for (let i = 0; i < totalPoints; i++) {
    // Distribute timestamps:
    // 40% in last 24 hours
    // 40% in last 2-7 days
    // 20% in last 8-30 days
    const rand = Math.random();
    let offsetMs;
    if (rand < 0.4) {
      offsetMs = Math.random() * 24 * 3600 * 1000;
    } else if (rand < 0.8) {
      offsetMs = (1 + Math.random() * 6) * 24 * 3600 * 1000;
    } else {
      offsetMs = (7 + Math.random() * 23) * 24 * 3600 * 1000;
    }
    const timestamp = new Date(now - offsetMs);

    // Pick path
    const pathRand = Math.random() * 100;
    let accum = 0;
    let chosen = samplePaths[0];
    for (const p of samplePaths) {
      accum += p.weight;
      if (pathRand <= accum) {
        chosen = p;
        break;
      }
    }

    // Determine status code
    let statusCode = 200;
    const statusRand = Math.random();
    if (chosen.path === "/not-found-page") {
      statusCode = 404;
    } else if (statusRand < 0.88) {
      statusCode = 200;
    } else if (statusRand < 0.94) {
      statusCode = 304; // Not Modified
    } else if (statusRand < 0.98) {
      statusCode = 404; // Not Found
    } else {
      statusCode = 500; // Internal Server Error
    }

    // Determine latency: normally 15ms - 75ms, occasional spike to 250ms
    let latencyMs = Math.floor(18 + Math.random() * 45);
    if (Math.random() < 0.07) {
      latencyMs = Math.floor(120 + Math.random() * 180);
    }
    if (statusCode >= 500) {
      latencyMs = Math.floor(150 + Math.random() * 300);
    }

    const ipHash = ipPool[Math.floor(Math.random() * ipPool.length)];
    const bytesSent = Math.floor(350 + Math.random() * 4500);

    records.push({
      projectId,
      userId,
      timestamp,
      statusCode,
      responseTimeMs: latencyMs,
      ipHash,
      method: chosen.method,
      path: chosen.path,
      bytesSent,
    });
  }

  return records;
};

/**
 * Ensures project exists and user has authorized access.
 */
const verifyProjectAccess = async (projectId, userId, isSuperAdmin) => {
  const result = await pool.query(
    `SELECT id, name, owner_id FROM projects WHERE id = $1`,
    [projectId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }

  const project = result.rows[0];
  if (!isSuperAdmin && project.owner_id !== userId) {
    const error = new Error("Unauthorized to access analytics for this project");
    error.status = 403;
    throw error;
  }

  return project;
};

/**
 * Retrieves full analytics dashboard for a project.
 */
const getProjectAnalytics = async (projectId, timeRange = "24h", userId, isSuperAdmin) => {
  const project = await verifyProjectAccess(projectId, userId, isSuperAdmin);

  // Check if project has any records yet; seed baseline sample if empty
  const recordCount = await analyticsRepo.countProjectRecords(projectId);
  if (recordCount === 0) {
    const seedRecords = generateSampleTraffic(projectId, project.owner_id, 140);
    await analyticsRepo.insertBatch(seedRecords);
  }

  // Fetch summary, timeline, and top paths in parallel
  const [summary, rawTimeline, topPaths] = await Promise.all([
    analyticsRepo.getProjectAnalyticsSummary(projectId, timeRange),
    analyticsRepo.getProjectTimeline(projectId, timeRange),
    analyticsRepo.getProjectTopPaths(projectId, timeRange, 6),
  ]);

  const totalRequests = Number(summary?.total_requests || 0);
  const status2xx = Number(summary?.status_2xx || 0);
  const status3xx = Number(summary?.status_3xx || 0);
  const status4xx = Number(summary?.status_4xx || 0);
  const status5xx = Number(summary?.status_5xx || 0);

  const successCount = status2xx + status3xx;
  const errorCount = status4xx + status5xx;
  const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : "100.0";
  const errorRate = totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(1) : "0.0";

  const statusBreakdown = {
    "2xx": {
      count: status2xx,
      percentage: totalRequests > 0 ? Math.round((status2xx / totalRequests) * 100) : 0,
      label: "Success (2xx)",
      color: "#22c55e",
    },
    "3xx": {
      count: status3xx,
      percentage: totalRequests > 0 ? Math.round((status3xx / totalRequests) * 100) : 0,
      label: "Redirect (3xx)",
      color: "#38bdf8",
    },
    "4xx": {
      count: status4xx,
      percentage: totalRequests > 0 ? Math.round((status4xx / totalRequests) * 100) : 0,
      label: "Client Error (4xx)",
      color: "#eab308",
    },
    "5xx": {
      count: status5xx,
      percentage: totalRequests > 0 ? Math.round((status5xx / totalRequests) * 100) : 0,
      label: "Server Error (5xx)",
      color: "#ef4444",
    },
  };

  return {
    projectId,
    projectName: project.name,
    timeRange,
    summary: {
      totalRequests,
      uniqueVisitors: Number(summary?.unique_visitors || 0),
      avgLatencyMs: Number(summary?.avg_latency_ms || 0),
      minLatencyMs: Number(summary?.min_latency_ms || 0),
      maxLatencyMs: Number(summary?.max_latency_ms || 0),
      totalBytesSent: Number(summary?.total_bytes_sent || 0),
      successRate: Number(successRate),
      errorRate: Number(errorRate),
      statusBreakdown,
    },
    timeline: rawTimeline.map((item) => ({
      time: item.bucket_time,
      requests: Number(item.requests || 0),
      avgLatency: Number(item.avg_latency || 0),
      successCount: Number(item.success_count || 0),
      errorCount: Number(item.error_count || 0),
    })),
    topPaths: topPaths.map((p) => ({
      path: p.path,
      method: p.method,
      requests: Number(p.requests || 0),
      avgLatency: Number(p.avg_latency || 0),
      errors: Number(p.errors || 0),
    })),
  };
};

/**
 * Simulates simulated traffic requests to verify real-time metrics.
 */
const simulateTraffic = async (projectId, count = 20, userId, isSuperAdmin) => {
  const project = await verifyProjectAccess(projectId, userId, isSuperAdmin);
  const records = generateSampleTraffic(projectId, project.owner_id, Math.min(count, 50));
  // Override timestamps to be within the last 5 minutes
  const now = Date.now();
  records.forEach((r, idx) => {
    r.timestamp = new Date(now - (records.length - idx) * 3000);
  });

  await analyticsRepo.insertBatch(records);

  return {
    success: true,
    message: `Generated ${records.length} simulated traffic requests for ${project.name}`,
    count: records.length,
  };
};

/**
 * Retrieves per-user traffic analytics for SuperAdmin Server Health.
 */
const getSuperAdminUserAnalytics = async () => {
  const [users, platform] = await Promise.all([
    analyticsRepo.getSuperAdminUserAnalytics(),
    analyticsRepo.getSuperAdminPlatformTraffic(),
  ]);

  const formattedUsers = users.map((u) => {
    const total30d = Number(u.total_requests_30d || 0);
    const errors = Number(u.count_4xx || 0) + Number(u.count_5xx || 0);
    const errorRate = total30d > 0 ? ((errors / total30d) * 100).toFixed(1) : "0.0";

    return {
      userId: u.user_id,
      username: u.username,
      email: u.email,
      isOwner: Boolean(u.is_owner),
      canCustomSubdomain: Boolean(u.can_custom_subdomain),
      createdAt: u.created_at,
      projectCount: Number(u.project_count || 0),
      runningProjectCount: Number(u.running_project_count || 0),
      totalRequests30d: total30d,
      totalRequests24h: Number(u.total_requests_24h || 0),
      uniqueVisitors30d: Number(u.unique_visitors_30d || 0),
      avgLatencyMs: Number(u.avg_latency_ms || 0),
      totalBytesSent: Number(u.total_bytes_sent || 0),
      statusBreakdown: {
        "2xx": Number(u.count_2xx || 0),
        "3xx": Number(u.count_3xx || 0),
        "4xx": Number(u.count_4xx || 0),
        "5xx": Number(u.count_5xx || 0),
      },
      errorRate: Number(errorRate),
    };
  });

  return {
    platform: {
      totalRequests30d: Number(platform?.total_requests_30d || 0),
      totalRequests24h: Number(platform?.total_requests_24h || 0),
      uniqueVisitors30d: Number(platform?.unique_visitors_30d || 0),
      avgLatencyMs: Number(platform?.avg_latency_ms || 0),
      totalBytesSent: Number(platform?.total_bytes_sent || 0),
      statusBreakdown: {
        "2xx": Number(platform?.count_2xx || 0),
        "3xx": Number(platform?.count_3xx || 0),
        "4xx": Number(platform?.count_4xx || 0),
        "5xx": Number(platform?.count_5xx || 0),
      },
    },
    users: formattedUsers,
  };
};

module.exports = {
  getProjectAnalytics,
  simulateTraffic,
  getSuperAdminUserAnalytics,
  recordRequest: analyticsRepo.recordRequest,
};
