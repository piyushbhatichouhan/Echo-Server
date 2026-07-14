const { pool } = require("../config/database");
const environmentRepository = require("../repositories/environment.repository");

const verifyProjectOwnership = async (projectId, ownerId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM projects
    WHERE id = $1
    AND owner_id = $2
    `,
    [projectId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
};

const createEnvironmentVariable = async (projectId, ownerId, variable) => {
  await verifyProjectOwnership(projectId, ownerId);

  const { key, value, secret } = variable;

  const result = await pool.query(
    `
  INSERT INTO environment_variables
  (
      project_id,
      variable_key,
      variable_value,
      is_secret
  )
  VALUES
  (
      $1,$2,$3,$4
  )
  RETURNING
      id,
      project_id,
      variable_key,
      is_secret,
      created_at
  `,
    [projectId, key, value, secret],
  );

  return result.rows[0];
};

const getEnvironmentVariables = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  return await environmentRepository.getEnvironmentByProjectId(projectId);
};

module.exports = {
  createEnvironmentVariable,
  getEnvironmentVariables,
};
