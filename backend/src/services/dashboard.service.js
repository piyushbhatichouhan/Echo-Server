const { pool } = require("../config/database");
const storageService = require("./storage.service");

const getDashboard = async (userId) => {
  const [
    projectsResult,
    runningResult,
    deploymentResult,
    recentProjectsResult,
    recentDeploymentsResult,
    storageStats,
    dockerAlive,
    diskInfo,
  ] = await Promise.all([
    // Total Projects
    pool.query(
      `SELECT COUNT(*)::int AS total FROM projects WHERE owner_id = $1`,
      [userId],
    ),
    // Running Containers
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM deployments d
       JOIN projects p ON p.id = d.project_id
       WHERE p.owner_id = $1 AND LOWER(d.status) = 'running'`,
      [userId],
    ),
    // Total Deployments
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM deployments d
       JOIN projects p ON p.id = d.project_id
       WHERE p.owner_id = $1`,
      [userId],
    ),
    // Recent Projects with latest deployment details
    pool.query(
      `SELECT
         p.id,
         p.name,
         p.git_connected,
         p.updated_at,
         COALESCE(d.status, 'Not Deployed') AS status,
         d.port,
         d.git_branch,
         d.commit_hash,
         d.commit_message,
         d.created_at AS last_deployed_at
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT status, port, git_branch, commit_hash, commit_message, created_at
         FROM deployments
         WHERE project_id = p.id
         ORDER BY CASE WHEN status = 'running' THEN 0 ELSE 1 END, updated_at DESC, created_at DESC
         LIMIT 1
       ) d ON TRUE
       WHERE p.owner_id = $1
       ORDER BY p.updated_at DESC
       LIMIT 6`,
      [userId],
    ),
    // Recent Deployment Activities across all user's projects
    pool.query(
      `SELECT
         d.id,
         d.project_id,
         p.name AS project_name,
         d.status,
         d.port,
         d.git_branch,
         d.commit_hash,
         d.commit_message,
         d.commit_author,
         d.created_at,
         d.updated_at
       FROM deployments d
       JOIN projects p ON p.id = d.project_id
       WHERE p.owner_id = $1
       ORDER BY d.created_at DESC
       LIMIT 6`,
      [userId],
    ),
    storageService.getUserStorageStats(userId).catch(() => null),
  ]);

  return {
    overview: {
      projects: projectsResult.rows[0]?.total || 0,
      running: runningResult.rows[0]?.total || 0,
      deployments: deploymentResult.rows[0]?.total || 0,
      storage: storageStats,
    },
    projects: {
      recent: recentProjectsResult.rows,
    },
    activity: {
      recent: recentDeploymentsResult.rows,
    },
  };
};

module.exports = {
  getDashboard,
};
