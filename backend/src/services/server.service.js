const { pool } = require("../config/database");

const getPendingUsers = async () => {
  const result = await pool.query(
    `
    SELECT
        id,
        username,
        email,
        created_at
    FROM users
    WHERE status = 'pending'
    ORDER BY created_at ASC
    `,
  );

  return result.rows;
};

const approveUser = async (userId) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
        status = 'approved',
        updated_at = NOW()
    WHERE id = $1
    RETURNING
        id,
        username,
        email,
        status
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const rejectUser = async (userId) => {
  const result = await pool.query(
    `
    UPDATE users
    SET
        status = 'rejected',
        updated_at = NOW()
    WHERE id = $1
    RETURNING
        id,
        username,
        email,
        status
    `,
    [userId],
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
};
