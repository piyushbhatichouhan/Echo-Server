const { pool } = require("../config/database");

const createProjectSettings = async (projectId, preset) => {
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
        port
    )
    VALUES
    (
        $1,$2,$3,$4,$5,$6,$7,$8
    )
    RETURNING *
    `,
    [
      projectId,
      preset.runtime,
      preset.working_directory,
      preset.install_command,
      preset.build_command,
      preset.start_command,
      preset.output_directory,
      preset.port,
    ],
  );

  return result.rows[0];
};

module.exports = {
  createProjectSettings,
};
