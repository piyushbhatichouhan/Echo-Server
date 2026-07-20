const { pool } = require("../config/database");

/*
|--------------------------------------------------------------------------
| Existing functions (keep)
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

  return result.rows;
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
  for (const variable of variables) {
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
      [projectId, variable.key, variable.value],
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

  return result.rows;
};

const getEnvironmentVariableByKey = async (projectId, key) => {
  const result = await pool.query(
    `
    SELECT *
    FROM environment_variables
    WHERE project_id = $1
      AND variable_key = $2
    `,
    [projectId, key],
  );

  return result.rows[0];
};

const createEnvironmentVariable = async (projectId, key, value) => {
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
    [projectId, key, value],
  );

  return result.rows[0];
};

const updateEnvironmentVariable = async (variableId, key, value) => {
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
    [variableId, key, value],
  );

  return result.rows[0];
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
