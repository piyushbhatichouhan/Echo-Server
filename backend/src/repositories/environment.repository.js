const { pool } = require("../config/database");

const getEnvironmentByProjectId = async (projectId) => {
  const result = await pool.query(
    `
  SELECT
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
        key,
        value
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

module.exports = {
  getEnvironmentByProjectId,
  deleteEnvironmentByProjectId,
  createEnvironmentVariables,
};
