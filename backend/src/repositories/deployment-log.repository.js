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
    dl.timestamp,
    dl.message
FROM deployment_logs dl
INNER JOIN deployments d
    ON d.id = dl.deployment_id
WHERE
    d.project_id = $1
ORDER BY
    dl.timestamp ASC;
        `,
    [projectId],
  );

  return result.rows;
};

module.exports = {
  addLog,
  getLogs,
};
