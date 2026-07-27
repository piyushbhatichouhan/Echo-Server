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
      created_at,
      updated_at,
      pending_deletion,
deletion_due_at,
storage_limit,
deletion_scheduled_at
    FROM users
    ORDER BY created_at DESC
    `,
  );

  return result.rows;
};

const getUserById = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      disabled,
      pending_deletion,
      deletion_due_at,
      deletion_scheduled_at,
      created_at,
      storage_limit,
      updated_at
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
    `,
    [userId],
  );
};

const updateStorageLimit = async (userId, storageLimit) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
        storage_limit = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING
        id,
        username,
        storage_limit
    `,
    [userId, storageLimit],
  );

  return result.rows[0];
};

const getUsersForStorage = async () => {
  const result = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      storage_limit,
      disabled,
      pending_deletion
    FROM users
    WHERE is_owner = FALSE
    ORDER BY username ASC
    `,
  );

  return result.rows;
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
  updateStorageLimit,
  getUsersForStorage,
};
