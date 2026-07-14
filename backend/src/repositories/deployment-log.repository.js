const { pool } = require("../config/database");

const addLog = async (deploymentId, message) => {
  await pool.query(
    `
    INSERT INTO deployment_logs
    (
        deployment_id,
        message
    )
    VALUES
    (
        $1,
        $2
    )
    `,
    [deploymentId, message],
  );
};

const getLogs = async (projectId) => {
  const result = await pool.query(
    `
        SELECT
            dl.id,
            dl.message,
            dl.created_at
        FROM deployment_logs dl
        INNER JOIN deployments d
            ON d.id = dl.deployment_id
        WHERE
            d.project_id = $1
        AND
            d.id = (
                SELECT id
                FROM deployments
                WHERE project_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            )
        ORDER BY dl.created_at ASC
        `,
    [projectId],
  );

  return result.rows;
};

module.exports = {
  addLog,
  getLogs,
};
