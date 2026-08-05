const { pool } = require("../config/database");

const getProjectDomain = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_domains
    WHERE project_id = $1
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [projectId],
  );

  return rows[0] || null;
};

const listProjectDomains = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_domains
    WHERE project_id = $1
    ORDER BY created_at ASC
    `,
    [projectId],
  );

  return rows;
};

const createProjectDomain = async (projectId, hostname, options = {}) => {
  const { customDomain = null, isCustom = false, isPrimary = true } = options;

  const { rows } = await pool.query(
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
    [projectId, hostname, customDomain, isCustom, isPrimary],
  );

  return rows[0];
};

const updateProjectDomain = async (id, updates) => {
  const fields = [];
  const values = [];

  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index}`);
    values.push(value);
    index++;
  }

  values.push(id);

  const { rows } = await pool.query(
    `
    UPDATE project_domains
    SET
      ${fields.join(", ")},
      updated_at = NOW()
    WHERE id = $${index}
    RETURNING *
    `,
    values,
  );

  return rows[0] || null;
};

const deleteProjectDomain = async (projectId) => {
  await pool.query(
    `
    DELETE FROM project_domains
    WHERE project_id = $1
    `,
    [projectId],
  );
};

const getDomainByHostname = async (hostname) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_domains
    WHERE hostname = $1
    LIMIT 1
    `,
    [hostname],
  );

  return rows[0] || null;
};

module.exports = {
  getProjectDomain,
  listProjectDomains,
  createProjectDomain,
  updateProjectDomain,
  deleteProjectDomain,
  getDomainByHostname,
};
