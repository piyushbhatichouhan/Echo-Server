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

const getSubdomainRequestByProject = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT sr.*, p.name as project_name, u.username, u.email
    FROM subdomain_requests sr
    JOIN projects p ON p.id = sr.project_id
    JOIN users u ON u.id = sr.user_id
    WHERE sr.project_id = $1
    LIMIT 1
    `,
    [projectId],
  );
  return rows[0] || null;
};

const getSubdomainRequestById = async (id) => {
  const { rows } = await pool.query(
    `
    SELECT sr.*, p.name as project_name, u.username, u.email
    FROM subdomain_requests sr
    JOIN projects p ON p.id = sr.project_id
    JOIN users u ON u.id = sr.user_id
    WHERE sr.id = $1
    LIMIT 1
    `,
    [id],
  );
  return rows[0] || null;
};

const getApprovedSubdomainRequest = async (projectId, subdomain) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM subdomain_requests
    WHERE project_id = $1 AND LOWER(subdomain) = LOWER($2) AND status = 'approved'
    LIMIT 1
    `,
    [projectId, subdomain],
  );
  return rows[0] || null;
};

const getPendingOrApprovedRequestBySubdomain = async (subdomain, excludeProjectId = null) => {
  let query = `
    SELECT *
    FROM subdomain_requests
    WHERE LOWER(subdomain) = LOWER($1) AND status IN ('pending', 'approved')
  `;
  const params = [subdomain];
  if (excludeProjectId) {
    query += ` AND project_id != $2`;
    params.push(excludeProjectId);
  }
  query += ` LIMIT 1`;
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
};

const createOrUpdateSubdomainRequest = async (
  projectId,
  userId,
  subdomain,
  hostname,
  status = "pending",
  adminNotes = null,
) => {
  const existing = await pool.query(
    `SELECT id FROM subdomain_requests WHERE project_id = $1 LIMIT 1`,
    [projectId],
  );

  if (existing.rows.length > 0) {
    const { rows } = await pool.query(
      `
      UPDATE subdomain_requests
      SET
        subdomain = $1,
        hostname = $2,
        status = $3,
        admin_notes = $4,
        updated_at = NOW()
      WHERE project_id = $5
      RETURNING *
      `,
      [subdomain, hostname, status, adminNotes, projectId],
    );
    return rows[0];
  } else {
    const { rows } = await pool.query(
      `
      INSERT INTO subdomain_requests (
        project_id,
        user_id,
        subdomain,
        hostname,
        status,
        admin_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [projectId, userId, subdomain, hostname, status, adminNotes],
    );
    return rows[0];
  }
};

const deleteSubdomainRequestByProject = async (projectId) => {
  await pool.query(`DELETE FROM subdomain_requests WHERE project_id = $1`, [projectId]);
};

const deleteSubdomainRequestById = async (id) => {
  await pool.query(`DELETE FROM subdomain_requests WHERE id = $1`, [id]);
};

const updateSubdomainRequestStatus = async (
  id,
  { status, adminNotes = null, reviewedBy = null, reviewedAt = new Date() },
) => {
  const { rows } = await pool.query(
    `
    UPDATE subdomain_requests
    SET
      status = $1,
      admin_notes = $2,
      reviewed_by = $3,
      reviewed_at = $4,
      updated_at = NOW()
    WHERE id = $5
    RETURNING *
    `,
    [status, adminNotes, reviewedBy, reviewedAt, id],
  );
  return rows[0] || null;
};

const listSubdomainRequests = async (filters = {}) => {
  const { status, search } = filters;
  const whereClauses = [];
  const params = [];

  if (status && status !== "all") {
    params.push(status);
    whereClauses.push(`sr.status = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    whereClauses.push(`(
      LOWER(sr.subdomain) LIKE $${params.length} OR
      LOWER(sr.hostname) LIKE $${params.length} OR
      LOWER(p.name) LIKE $${params.length} OR
      LOWER(u.username) LIKE $${params.length} OR
      LOWER(u.email) LIKE $${params.length}
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `
    SELECT
      sr.*,
      p.name as project_name,
      u.username as developer_username,
      u.email as developer_email,
      reviewer.username as reviewer_username
    FROM subdomain_requests sr
    JOIN projects p ON p.id = sr.project_id
    JOIN users u ON u.id = sr.user_id
    LEFT JOIN users reviewer ON reviewer.id = sr.reviewed_by
    ${whereSql}
    ORDER BY
      CASE WHEN sr.status = 'pending' THEN 0 ELSE 1 END,
      sr.created_at DESC
    `,
    params,
  );
  return rows;
};

const getSubdomainRequestStats = async () => {
  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::INT as total,
      COUNT(*) FILTER (WHERE status = 'pending')::INT as pending,
      COUNT(*) FILTER (WHERE status = 'approved')::INT as approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::INT as rejected
    FROM subdomain_requests
    `,
  );
  return rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
};

module.exports = {
  getProjectDomain,
  listProjectDomains,
  createProjectDomain,
  updateProjectDomain,
  deleteProjectDomain,
  getDomainByHostname,
  getSubdomainRequestByProject,
  getSubdomainRequestById,
  getApprovedSubdomainRequest,
  getPendingOrApprovedRequestBySubdomain,
  createOrUpdateSubdomainRequest,
  deleteSubdomainRequestByProject,
  deleteSubdomainRequestById,
  updateSubdomainRequestStatus,
  listSubdomainRequests,
  getSubdomainRequestStats,
};
