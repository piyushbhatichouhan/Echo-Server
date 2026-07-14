const { pool } = require("../config/database");

const getApplicationByProjectId = async (projectId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM applications
    WHERE project_id = $1
    `,
    [projectId],
  );

  return result.rows[0] || null;
};

const createApplication = async (projectId, application) => {
  const { runtime, entryFile, buildCommand, startCommand, workingDirectory } =
    application;
  const result = await pool.query(
    `
    INSERT INTO applications
    (
      project_id,
      runtime,
      entry_file,
      build_command,
      start_command,
      working_directory
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6
    )
    RETURNING *
    `,
    [
      projectId,
      runtime,
      entryFile,
      buildCommand,
      startCommand,
      workingDirectory,
    ],
  );

  return result.rows[0];
};

const updateApplication = async (projectId, application) => {
  const { runtime, entryFile, buildCommand, startCommand, workingDirectory } =
    application;
  const result = await pool.query(
    `
    UPDATE applications
    SET
      runtime = $2,
      entry_file = $3,
      build_command = $4,
      start_command = $5,
      working_directory = $6,
      updated_at = NOW()
    WHERE project_id = $1
    RETURNING *
    `,
    [
      projectId,
      runtime,
      entryFile,
      buildCommand,
      startCommand,
      workingDirectory,
    ],
  );

  return result.rows[0];
};

const deleteApplication = async (projectId) => {
  const result = await pool.query(
    `
    DELETE FROM applications
    WHERE project_id = $1
    RETURNING *
    `,
    [projectId],
  );

  return result.rows[0] || null;
};
module.exports = {
  getApplicationByProjectId,
  createApplication,
  updateApplication,
  deleteApplication,
};
