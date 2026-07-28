const { pool } = require("../config/database");

const getSettings = async () => {
  const result = await pool.query(`
        SELECT *
        FROM server_settings
        LIMIT 1
    `);

  return result.rows[0];
};

const updateSettings = async ({
  reserved_storage_bytes,
  default_user_quota_bytes,
}) => {
  const result = await pool.query(
    `
UPDATE server_settings
SET

reserved_storage_bytes=$1,

default_user_quota_bytes=$2,

updated_at=NOW()

RETURNING *
`,
    [reserved_storage_bytes, default_user_quota_bytes],
  );

  return result.rows[0];
};

const getAllocatedStorage = async () => {
  const result = await pool.query(`
        SELECT
        COALESCE(SUM(quota_bytes),0) AS allocated
        FROM users
    `);

  return Number(result.rows[0].allocated);
};

module.exports = {
  getSettings,
  updateSettings,
  getAllocatedStorage,
};
