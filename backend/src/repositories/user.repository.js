const { pool } = require("../config/database");

const getUsers = async () => {
  const result = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      is_owner,
      disabled,
      can_custom_subdomain,
      created_at,
      updated_at,
      pending_deletion,
      deletion_due_at,
      storage_limit,
      deletion_scheduled_at,
      COALESCE(ram_limit_mb, 512) AS ram_limit_mb,
      COALESCE(max_active_projects, 2) AS max_active_projects,
      COALESCE(max_projects, 5) AS max_projects,
      quota_bytes,
      used_bytes
    FROM users
    ORDER BY created_at DESC
    `,
  );

  return result.rows;
};

const getUserById = async (userId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    `,
    [userId],
  );

  return result.rows[0];
};

const updateDisabledStatus = async (userId, disabled) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
      disabled = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      username,
      email,
      disabled
    `,
    [userId, disabled],
  );

  return result.rows[0];
};

const deleteUser = async (userId) => {
  await pool.query(
    `
    DELETE FROM users
WHERE id = $1
AND is_owner = FALSE;
    `,
    [userId],
  );
};

const scheduleUserDeletion = async (userId) => {
  const graceHours = Number(process.env.USER_DELETION_GRACE_HOURS) || 24;

  const result = await pool.query(
    `
  UPDATE users
  SET
    disabled = TRUE,
    pending_deletion = TRUE,
    deletion_scheduled_at = NOW(),
    deletion_due_at = NOW() + ($2 * INTERVAL '1 hour')
  WHERE id = $1
  AND is_owner = FALSE
  RETURNING *
  `,
    [userId, graceHours],
  );

  return result.rows[0];
};

const restoreUser = async (userId) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
      disabled = FALSE,
      pending_deletion = FALSE,
      deletion_scheduled_at = NULL,
      deletion_due_at = NULL
    WHERE id = $1
    RETURNING *
    `,
    [userId],
  );

  return result.rows[0];
};

const getExpiredUsers = async () => {
  const result = await pool.query(
    `
    SELECT *
    FROM users
    WHERE
      pending_deletion = TRUE
    AND
      deletion_due_at <= NOW()
    `,
  );

  return result.rows;
};

const deleteUserTx = async (client, userId) => {
  await client.query(
    `
  DELETE FROM users
WHERE id = $1
AND is_owner = FALSE;
    `,
    [userId],
  );
};

const getUsersForStorage = async () => {
  const result = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      quota_bytes,
      used_bytes,
      disabled,
      pending_deletion
    FROM users
    WHERE is_owner = FALSE
    ORDER BY username ASC
    `,
  );

  return result.rows;
};

const updateUserQuota = async (userId, quotaBytes) => {
  const result = await pool.query(
    `
    UPDATE users
    SET quota_bytes = $2
    WHERE id = $1
    RETURNING *
    `,
    [userId, quotaBytes],
  );

  return result.rows[0];
};

const incrementUsedBytes = async (userId, bytes) => {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes === 0) return;
  await pool.query(
    `
        UPDATE users
        SET used_bytes = COALESCE(used_bytes, 0) + $2
        WHERE id = $1
        `,
    [userId, safeBytes],
  );
};

const decrementUsedBytes = async (userId, bytes) => {
  const safeBytes = Math.max(0, Number(bytes) || 0);
  if (safeBytes === 0) return;
  await pool.query(
    `
        UPDATE users
        SET used_bytes = GREATEST(0, COALESCE(used_bytes, 0) - $2)
        WHERE id = $1
        `,
    [userId, safeBytes],
  );
};

const getById = async (id) => {
  const result = await db.query(
    `
    SELECT *
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
};

const updateCustomSubdomainAccess = async (userId, enabled) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
      can_custom_subdomain = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      username,
      email,
      is_owner,
      can_custom_subdomain,
      disabled
    `,
    [userId, Boolean(enabled)],
  );

  return result.rows[0];
};

const updateUserLimits = async (userId, { ramLimitMb, maxActiveProjects, maxProjects }) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
      ram_limit_mb = COALESCE($2, ram_limit_mb),
      max_active_projects = COALESCE($3, max_active_projects),
      max_projects = COALESCE($4, max_projects),
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      username,
      email,
      ram_limit_mb,
      max_active_projects,
      max_projects
    `,
    [userId, ramLimitMb ?? null, maxActiveProjects ?? null, maxProjects ?? null],
  );

  return result.rows[0];
};

module.exports = {
  getUsers,
  getUserById,
  updateDisabledStatus,
  deleteUser,
  scheduleUserDeletion,
  restoreUser,
  getExpiredUsers,
  deleteUserTx,

  getUsersForStorage,
  updateUserQuota,
  incrementUsedBytes,
  decrementUsedBytes,

  getById,
  updateCustomSubdomainAccess,
  updateUserLimits,
};
