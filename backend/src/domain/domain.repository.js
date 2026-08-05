const db = require("../config/database"); // <-- adjust this if your DB helper lives elsewhere

const hostnameExists = async (hostname) => {
  const result = await db.query(
    `
    SELECT EXISTS(
      SELECT 1
      FROM project_domains
      WHERE hostname = $1
    ) AS exists
    `,
    [hostname],
  );

  return result.rows[0].exists;
};

const findByHostname = async (hostname) => {
  const result = await db.query(
    `
    SELECT *
    FROM project_domains
    WHERE hostname = $1
    LIMIT 1
    `,
    [hostname],
  );

  return result.rows[0] || null;
};

const findPrimary = async (projectId) => {
  const result = await db.query(
    `
    SELECT *
    FROM project_domains
    WHERE project_id = $1
      AND is_primary = true
    LIMIT 1
    `,
    [projectId],
  );

  return result.rows[0] || null;
};

const findAll = async (projectId) => {
  const result = await db.query(
    `
    SELECT *
    FROM project_domains
    WHERE project_id = $1
    ORDER BY created_at ASC
    `,
    [projectId],
  );

  return result.rows;
};

const create = async ({
  project_id,
  hostname,
  custom_domain = null,
  is_custom = false,
  is_primary = true,
}) => {
  const result = await db.query(
    `
    INSERT INTO project_domains (
      project_id,
      hostname,
      custom_domain,
      is_custom,
      is_primary
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [project_id, hostname, custom_domain, is_custom, is_primary],
  );

  return result.rows[0];
};

const clearPrimary = async (projectId) => {
  await db.query(
    `
    UPDATE project_domains
    SET is_primary = false
    WHERE project_id = $1
    `,
    [projectId],
  );
};

const makePrimary = async (domainId) => {
  await db.query(
    `
    UPDATE project_domains
    SET is_primary = true
    WHERE id = $1
    `,
    [domainId],
  );
};

const remove = async (id) => {
  await db.query(
    `
    DELETE FROM project_domains
    WHERE id = $1
    `,
    [id],
  );
};

module.exports = {
  hostnameExists,
  findByHostname,
  findPrimary,
  findAll,
  create,
  clearPrimary,
  makePrimary,
  remove,
};
