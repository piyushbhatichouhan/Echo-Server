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

const getCertificateByHostname = async (hostname) => {
  if (!hostname) return null;
  const normalized = String(hostname).trim().toLowerCase();

  // 1. Try exact hostname match
  let { rows } = await pool.query(
    `SELECT certificate, private_key, hostname, expires_at
     FROM domain_certificates
     WHERE LOWER(hostname) = $1
     LIMIT 1`,
    [normalized],
  );

  if (rows.length > 0) return rows[0];

  // 2. Try wildcard match for subdomains (e.g. *.devpiyush.in)
  const parts = normalized.split(".");
  if (parts.length > 2) {
    const parentDomain = parts.slice(1).join(".");
    const wildcard = `*.${parentDomain}`;
    const wildcardRes = await pool.query(
      `SELECT certificate, private_key, hostname, expires_at
       FROM domain_certificates
       WHERE LOWER(hostname) = $1
       LIMIT 1`,
      [wildcard],
    );
    if (wildcardRes.rows.length > 0) return wildcardRes.rows[0];
  }

  // 3. Fallback to most recently updated certificate if available
  const fallbackRes = await pool.query(
    `SELECT certificate, private_key, hostname, expires_at
     FROM domain_certificates
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  return fallbackRes.rows[0] || null;
};

module.exports = {
  getProjectByHostname,
  getCertificateByHostname,
};
