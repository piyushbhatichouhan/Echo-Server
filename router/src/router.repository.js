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
    d.container_port,
    d.port,
    d.status AS deployment_status,

    pd.ssl_status,
    pd.verification_status,
    pd.publication_status
    `,
    [hostname],
  );
  console.log("[Router] Query result:", rows);
  return rows[0] || null;
};

module.exports = {
  getProjectByHostname,
};
