const { pool } = require("../config/database");

const createProjectSettings = async (projectId, preset = {}) => {
  const runtime = (preset.runtime && String(preset.runtime).trim())
    ? String(preset.runtime).trim()
    : "node";
  const workingDirectory = (preset.working_directory && String(preset.working_directory).trim())
    ? String(preset.working_directory).trim()
    : ".";
  const installCommand = preset.install_command != null ? String(preset.install_command) : "npm install";
  const buildCommand = preset.build_command != null ? String(preset.build_command) : "npm run build";
  const startCommand = preset.start_command != null ? String(preset.start_command) : "npm start";
  const outputDirectory = (preset.output_directory && String(preset.output_directory).trim())
    ? String(preset.output_directory).trim()
    : ".";
  const dockerfile = preset.dockerfile != null ? String(preset.dockerfile) : "";

  const result = await pool.query(
    `
    INSERT INTO project_settings
    (
        project_id,
        runtime,
        working_directory,
        install_command,
        build_command,
        start_command,
        output_directory,
        dockerfile
    )
    VALUES
    (
        $1, $2, $3, $4, $5, $6, $7, $8
    )
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
  createProjectSettings,
};
