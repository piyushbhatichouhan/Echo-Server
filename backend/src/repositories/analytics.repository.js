const { pool } = require("../config/database");

/**
 * Validates and converts timeRange to interval string.
 */
const getTimeInterval = (timeRange) => {
  switch (timeRange) {
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    case "24h":
    default:
      return "24 hours";
  }
};

/**
 * Validates and converts timeRange to date_trunc bucket.
 */
const getTruncBucket = (timeRange) => {
  switch (timeRange) {
    case "7d":
    case "30d":
      return "day";
    case "24h":
    default:
      return "hour";
  }
};

/**
 * Inserts a single HTTP request telemetry record.
 */
const recordRequest = async ({
  projectId,
  userId,
  statusCode,
  responseTimeMs,
  ipHash = null,
  method = "GET",
  path = "/",
  bytesSent = 0,
  timestamp = new Date(),
}) => {
  const query = `
    INSERT INTO http_analytics (
      project_id,
      user_id,
      timestamp,
      status_code,
      response_time_ms,
      ip_hash,
      method,
      path,
      bytes_sent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id;
  `;
  const values = [
    projectId,
    userId,
    timestamp,
    statusCode,
    responseTimeMs,
    ipHash,
    method,
    path,
    bytesSent,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Batch inserts telemetry records for efficiency during seeding or simulation.
 */
const insertBatch = async (records) => {
  if (!records || records.length === 0) return 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of records) {
      await client.query(
        `
        INSERT INTO http_analytics (
          project_id,
          user_id,
          timestamp,
          status_code,
          response_time_ms,
          ip_hash,
          method,
          path,
          bytes_sent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          r.projectId,
          r.userId,
          r.timestamp || new Date(),
          r.statusCode,
          r.responseTimeMs,
          r.ipHash,
          r.method || "GET",
          r.path || "/",
          r.bytesSent || 0,
        ],
      );
    }
    await client.query("COMMIT");
    return records.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Counts total analytics records for a given project.
 */
const countProjectRecords = async (projectId) => {
  const query = `SELECT COUNT(*) AS count FROM http_analytics WHERE project_id = $1`;
  const result = await pool.query(query, [projectId]);
  return parseInt(result.rows[0]?.count || 0, 10);
};

/**
 * Retrieves aggregate summary metrics for a project within a timeRange.
 */
const getProjectAnalyticsSummary = async (projectId, timeRange = "24h") => {
  const interval = getTimeInterval(timeRange);

  const query = `
    SELECT
      COUNT(*)::int AS total_requests,
      COUNT(DISTINCT ip_hash)::int AS unique_visitors,
      COALESCE(ROUND(AVG(response_time_ms)), 0)::int AS avg_latency_ms,
      COALESCE(MIN(response_time_ms), 0)::int AS min_latency_ms,
      COALESCE(MAX(response_time_ms), 0)::int AS max_latency_ms,
      COALESCE(SUM(bytes_sent), 0)::bigint AS total_bytes_sent,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS status_2xx,
      COUNT(*) FILTER (WHERE status_code >= 300 AND status_code < 400)::int AS status_3xx,
      COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS status_4xx,
      COUNT(*) FILTER (WHERE status_code >= 500 AND status_code < 600)::int AS status_5xx
    FROM http_analytics
    WHERE project_id = $1
      AND timestamp >= NOW() - $2::interval
  `;

  const result = await pool.query(query, [projectId, interval]);
  return result.rows[0];
};

/**
 * Retrieves timeline telemetry buckets for charts.
 */
const getProjectTimeline = async (projectId, timeRange = "24h") => {
  const interval = getTimeInterval(timeRange);
  const bucket = getTruncBucket(timeRange);

  const query = `
    SELECT
      date_trunc($3, timestamp) AS bucket_time,
      COUNT(*)::int AS requests,
      COALESCE(ROUND(AVG(response_time_ms)), 0)::int AS avg_latency,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::int AS success_count,
      COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count
    FROM http_analytics
    WHERE project_id = $1
      AND timestamp >= NOW() - $2::interval
    GROUP BY bucket_time
    ORDER BY bucket_time ASC
  `;

  const result = await pool.query(query, [projectId, interval, bucket]);
  return result.rows;
};

/**
 * Retrieves top endpoints requested for a project.
 */
const getProjectTopPaths = async (projectId, timeRange = "24h", limit = 6) => {
  const interval = getTimeInterval(timeRange);

  const query = `
    SELECT
      path,
      method,
      COUNT(*)::int AS requests,
      COALESCE(ROUND(AVG(response_time_ms)), 0)::int AS avg_latency,
      COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors
    FROM http_analytics
    WHERE project_id = $1
      AND timestamp >= NOW() - $2::interval
    GROUP BY path, method
    ORDER BY requests DESC
    LIMIT $3
  `;

  const result = await pool.query(query, [projectId, interval, limit]);
  return result.rows;
};

/**
 * Retrieves per-user analytics breakdown for SuperAdmin.
 */
const getSuperAdminUserAnalytics = async () => {
  const query = `
    SELECT 
      u.id AS user_id,
      u.username,
      u.email,
      u.is_owner,
      u.can_custom_subdomain,
      u.created_at,
      COUNT(DISTINCT p.id)::int AS project_count,
      COUNT(DISTINCT CASE WHEN d.status = 'running' THEN p.id END)::int AS running_project_count,
      COALESCE(COUNT(a.id), 0)::int AS total_requests_30d,
      COALESCE(COUNT(a.id) FILTER (WHERE a.timestamp >= NOW() - INTERVAL '24 hours'), 0)::int AS total_requests_24h,
      COALESCE(COUNT(DISTINCT a.ip_hash), 0)::int AS unique_visitors_30d,
      COALESCE(ROUND(AVG(a.response_time_ms)), 0)::int AS avg_latency_ms,
      COALESCE(SUM(a.bytes_sent), 0)::bigint AS total_bytes_sent,
      COALESCE(COUNT(a.id) FILTER (WHERE a.status_code >= 200 AND a.status_code < 300), 0)::int AS count_2xx,
      COALESCE(COUNT(a.id) FILTER (WHERE a.status_code >= 300 AND a.status_code < 400), 0)::int AS count_3xx,
      COALESCE(COUNT(a.id) FILTER (WHERE a.status_code >= 400 AND a.status_code < 500), 0)::int AS count_4xx,
      COALESCE(COUNT(a.id) FILTER (WHERE a.status_code >= 500 AND a.status_code < 600), 0)::int AS count_5xx
    FROM users u
    LEFT JOIN projects p ON p.owner_id = u.id
    LEFT JOIN deployments d ON d.project_id = p.id
    LEFT JOIN http_analytics a ON a.user_id = u.id AND a.timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY u.id, u.username, u.email, u.is_owner, u.can_custom_subdomain, u.created_at
    ORDER BY total_requests_30d DESC, u.username ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

/**
 * Retrieves aggregate platform-wide traffic stats for SuperAdmin.
 */
const getSuperAdminPlatformTraffic = async () => {
  const query = `
    SELECT
      COUNT(*)::int AS total_requests_30d,
      COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours')::int AS total_requests_24h,
      COUNT(DISTINCT ip_hash)::int AS unique_visitors_30d,
      COALESCE(ROUND(AVG(response_time_ms)), 0)::int AS avg_latency_ms,
      COALESCE(SUM(bytes_sent), 0)::bigint AS total_bytes_sent,
      COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300)::int AS count_2xx,
      COUNT(*) FILTER (WHERE status_code >= 300 AND status_code < 400)::int AS count_3xx,
      COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS count_4xx,
      COUNT(*) FILTER (WHERE status_code >= 500 AND status_code < 600)::int AS count_5xx
    FROM http_analytics
    WHERE timestamp >= NOW() - INTERVAL '30 days'
  `;

  const result = await pool.query(query);
  return result.rows[0];
};

module.exports = {
  recordRequest,
  insertBatch,
  countProjectRecords,
  getProjectAnalyticsSummary,
  getProjectTimeline,
  getProjectTopPaths,
  getSuperAdminUserAnalytics,
  getSuperAdminPlatformTraffic,
};
