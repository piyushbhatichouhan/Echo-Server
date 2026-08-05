const { pool } = require("./config/database");

const getProjectByHostname = async (hostname) => {
  console.log("[Router] Looking up:", hostname);

  const { rows } = await pool.query(
    `
SELECT
    pd.hostname,

    p.id AS project_id,
    p.name,

    d.container_name,
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
    pd.hostname = $1
AND pd.publication_status = 'active'

ORDER BY d.created_at DESC
LIMIT 1;
    `,
    [hostname],
  );
  console.log("[Router] Query result:", rows);
  return rows[0] || null;
};

module.exports = {
  getProjectByHostname,
};
