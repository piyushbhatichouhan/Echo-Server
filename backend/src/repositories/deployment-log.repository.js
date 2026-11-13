const { pool } = require("../config/database");

const addLog = async (deploymentId, message, level = "info", category = "system") => {
  try {
    const result = await pool.query(
      `
      INSERT INTO deployment_logs
      (
          deployment_id,
          message,
          level,
          category
      )
      VALUES
      (
          $1,
          $2,
          $3,
          $4
      )
      RETURNING id, timestamp, message, level, category
      `,
      [deploymentId, message, level, category],
    );

    return result.rows[0];
  } catch (err) {
    // Graceful fallback if level/category columns are missing during migration transitions
    const fallbackResult = await pool.query(
      `
      INSERT INTO deployment_logs (deployment_id, message)
      VALUES ($1, $2)
      RETURNING id, timestamp, message
      `,
      [deploymentId, message],
    );

    return {
      ...fallbackResult.rows[0],
      level,
      category,
    };
  }
};

const getLogs = async (projectId, options = {}) => {
  const { limit = 500, category = null, level = null } = options;

  let query = `
    SELECT
      dl.id,
      dl.timestamp,
      dl.message,
      COALESCE(dl.level, 'info') AS level,
      COALESCE(dl.category, 'system') AS category
    FROM deployment_logs dl
    INNER JOIN deployments d
      ON d.id = dl.deployment_id
    WHERE
      d.project_id = $1
  `;
  const params = [projectId];
  let idx = 2;

  if (category && category !== "all") {
    query += ` AND dl.category = $${idx++}`;
    params.push(category);
  }

  if (level && level !== "all") {
    query += ` AND dl.level = $${idx++}`;
    params.push(level);
  }

  query += `
    ORDER BY dl.timestamp ASC
    LIMIT $${idx}
  `;
  params.push(Number(limit) || 500);

  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    const fallback = await pool.query(
      `
      SELECT
        dl.id,
        dl.timestamp,
        dl.message
      FROM deployment_logs dl
      INNER JOIN deployments d
        ON d.id = dl.deployment_id
      WHERE
        d.project_id = $1
      ORDER BY dl.timestamp ASC
      LIMIT 500
      `,
      [projectId],
    );
    return fallback.rows;
  }
};

const clearLogs = async (projectId) => {
  const result = await pool.query(
    `
    DELETE FROM deployment_logs
    WHERE deployment_id IN (
      SELECT id FROM deployments WHERE project_id = $1
    )
    `,
    [projectId],
  );

  return result.rowCount;
};

module.exports = {
  addLog,
  getLogs,
  clearLogs,
};

