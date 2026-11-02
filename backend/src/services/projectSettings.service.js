const { pool } = require("../config/database");
const { verifyProjectOwnership } = require("./project.service");

const getProjectSettings = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
    SELECT *
    FROM project_settings
    WHERE project_id = $1
    `,
    [projectId],
  );

  if (result.rows.length === 0) {
    return await updateProjectSettings(projectId, ownerId, {});
  }

  return result.rows[0];
};

const updateProjectSettings = async (projectId, ownerId, settings = {}) => {
  await verifyProjectOwnership(projectId, ownerId);

  // Fetch current settings if available to merge partial updates safely
  const currentRes = await pool.query(
    `SELECT * FROM project_settings WHERE project_id = $1`,
    [projectId],
  );
  const current = currentRes.rows[0] || {};

  // 1. runtime: text NOT NULL DEFAULT 'node'
  const runtime = (settings.runtime && String(settings.runtime).trim())
    ? String(settings.runtime).trim()
    : (current.runtime || "node");

  // 2. working_directory: text NOT NULL DEFAULT '.'
  const rawWorkingDir = settings.working_directory !== undefined
    ? settings.working_directory
    : current.working_directory;
  const workingDirectory = (rawWorkingDir && String(rawWorkingDir).trim())
    ? String(rawWorkingDir).trim()
    : ".";

  // 3. install_command: text NOT NULL DEFAULT 'npm install'
  const rawInstallCmd = settings.install_command !== undefined
    ? settings.install_command
    : current.install_command;
  const installCommand = rawInstallCmd != null
    ? String(rawInstallCmd)
    : (current.install_command ?? "npm install");

  // 4. build_command: text NOT NULL DEFAULT 'npm run build'
  const rawBuildCmd = settings.build_command !== undefined
    ? settings.build_command
    : current.build_command;
  const buildCommand = rawBuildCmd != null
    ? String(rawBuildCmd)
    : (current.build_command ?? "");

  // 5. start_command: text NOT NULL DEFAULT 'npm start'
  const rawStartCmd = settings.start_command !== undefined
    ? settings.start_command
    : current.start_command;
  const startCommand = rawStartCmd != null
    ? String(rawStartCmd)
    : (current.start_command ?? "");

  // 6. output_directory: text NOT NULL DEFAULT '.'
  const rawOutputDir = settings.output_directory !== undefined
    ? settings.output_directory
    : current.output_directory;
  const outputDirectory = (rawOutputDir && String(rawOutputDir).trim())
    ? String(rawOutputDir).trim()
    : ".";

  // 7. dockerfile: text NOT NULL DEFAULT ''
  const rawDockerfile = settings.dockerfile !== undefined
    ? settings.dockerfile
    : current.dockerfile;
  const dockerfile = rawDockerfile != null
    ? String(rawDockerfile)
    : (current.dockerfile ?? "");

  const result = await pool.query(
    `
    INSERT INTO project_settings (
      project_id,
      runtime,
      working_directory,
      install_command,
      build_command,
      start_command,
      output_directory,
      dockerfile,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (project_id) DO UPDATE SET
      runtime = EXCLUDED.runtime,
      working_directory = EXCLUDED.working_directory,
      install_command = EXCLUDED.install_command,
      build_command = EXCLUDED.build_command,
      start_command = EXCLUDED.start_command,
      output_directory = EXCLUDED.output_directory,
      dockerfile = EXCLUDED.dockerfile,
      updated_at = NOW()
    RETURNING *
    `,
    [
      projectId,
      runtime,
      workingDirectory,
      installCommand,
      buildCommand,
      startCommand,
      outputDirectory,
      dockerfile,
    ],
  );

  return result.rows[0];
};

module.exports = {
  getProjectSettings,
  updateProjectSettings,
};
