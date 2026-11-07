const { pool } = require("../config/database");
const { encrypt, decrypt } = require("../utils/crypto.util");

/**
 * Maps a single database row, decrypting variable_value if encrypted.
 */
const mapDecryptedRow = (row) => {
  if (!row) return null;
  const rawValue = row.value !== undefined ? row.value : row.variable_value;
  const decryptedVal = decrypt(rawValue);

  return {
    ...row,
    key: row.key || row.variable_key,
    value: decryptedVal,
    variable_value: decryptedVal,
  };
};

/**
 * Maps multiple database rows, decrypting values.
 */
const mapDecryptedRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapDecryptedRow);
};

/*
|--------------------------------------------------------------------------
| Existing functions
|--------------------------------------------------------------------------
*/

const getEnvironmentByProjectId = async (projectId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      variable_key AS key,
      variable_value AS value
    FROM environment_variables
    WHERE project_id = $1
    ORDER BY variable_key
    `,
    [projectId],
  );

  return mapDecryptedRows(result.rows);
};

const deleteEnvironmentByProjectId = async (projectId) => {
  await pool.query(
    `
    DELETE FROM environment_variables
    WHERE project_id = $1
    `,
    [projectId],
  );
};

const createEnvironmentVariables = async (projectId, variables) => {
  if (!Array.isArray(variables)) return;
  for (const variable of variables) {
    if (!variable || !variable.key) continue;

    const safeKey = String(variable.key).trim();
    const rawValue = String(variable.value ?? "");
    const encryptedValue = encrypt(rawValue);

    await pool.query(
      `
      INSERT INTO environment_variables
      (
        project_id,
        variable_key,
        variable_value
      )
      VALUES
      (
        $1,
        $2,
        $3
      )
      `,
      [projectId, safeKey, encryptedValue],
    );
  }
};

/*
|--------------------------------------------------------------------------
| CRUD functions for Environment page
|--------------------------------------------------------------------------
*/

const getEnvironmentVariables = async (projectId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      variable_key AS key,
      variable_value AS value
    FROM environment_variables
    WHERE project_id = $1
    ORDER BY variable_key
    `,
    [projectId],
  );

  return mapDecryptedRows(result.rows);
};

const getEnvironmentVariableByKey = async (projectId, key) => {
  const result = await pool.query(
    `
    SELECT
      id,
      project_id,
      variable_key AS key,
      variable_key,
      variable_value AS value,
      variable_value
    FROM environment_variables
    WHERE project_id = $1
      AND variable_key = $2
    `,
    [projectId, key],
  );

  return mapDecryptedRow(result.rows[0]);
};

const createEnvironmentVariable = async (projectId, key, value) => {
  const safeKey = String(key || "").trim();
  const safeValue = String(value ?? "");
  const encryptedValue = encrypt(safeValue);

  const result = await pool.query(
    `
    INSERT INTO environment_variables
    (
      project_id,
      variable_key,
      variable_value
    )
    VALUES
    (
      $1,
      $2,
      $3
    )
    RETURNING
      id,
      variable_key AS key,
      variable_value AS value
    `,
    [projectId, safeKey, encryptedValue],
  );

  return mapDecryptedRow(result.rows[0]);
};

const updateEnvironmentVariable = async (variableId, key, value) => {
  const safeKey = String(key || "").trim();
  const safeValue = String(value ?? "");
  const encryptedValue = encrypt(safeValue);

  const result = await pool.query(
    `
    UPDATE environment_variables
    SET
      variable_key = $2,
      variable_value = $3,
      updated_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      variable_key AS key,
      variable_value AS value
    `,
    [variableId, safeKey, encryptedValue],
  );

  return mapDecryptedRow(result.rows[0]);
};

const deleteEnvironmentVariable = async (variableId) => {
  await pool.query(
    `
    DELETE FROM environment_variables
    WHERE id = $1
    `,
    [variableId],
  );
};

module.exports = {
  getEnvironmentByProjectId,
  deleteEnvironmentByProjectId,
  createEnvironmentVariables,

  getEnvironmentVariables,
  getEnvironmentVariableByKey,
  createEnvironmentVariable,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
};
