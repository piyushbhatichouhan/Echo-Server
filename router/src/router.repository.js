const { pool } = require("./config/database");

const getProjectByHostname = async (hostname) => {
  if (!hostname) return null;

  const normalizedHostname = String(hostname).trim().toLowerCase();

  const { rows } = await pool.query(
    `
    SELECT
        pd.hostname,

        p.id AS project_id,
        p.name,
        p.owner_id AS user_id,
        p.application_type,

        d.id AS deployment_id,
        d.container_name,
        d.container_port,
        d.port,
        d.status AS deployment_status,

        pd.ssl_status,
        pd.verification_status,
        pd.publication_status

    FROM project_domains pd

    JOIN projects p
      ON p.id = pd.project_id

    LEFT JOIN deployments d
      ON d.project_id = p.id

    WHERE
        LOWER(pd.hostname) = $1
      AND pd.publication_status = 'active'

    ORDER BY
        CASE WHEN d.status = 'running' THEN 0 ELSE 1 END,
        d.updated_at DESC,
        d.created_at DESC
    LIMIT 1;
    `,
    [normalizedHostname],
  );

  return rows[0] || null;
};

module.exports = {
  getProjectByHostname,
};
