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

  return result.rows[0];
};

const updateProjectSettings = async (projectId, ownerId, settings) => {
  await verifyProjectOwnership(projectId, ownerId);

  const result = await pool.query(
    `
UPDATE project_settings
SET

runtime=$2,

working_directory=$3,

install_command=$4,

build_command=$5,

start_command=$6,

port=$7,

updated_at=NOW()

WHERE project_id=$1

RETURNING *
`,
    [
      projectId,

      settings.runtime,

      settings.working_directory,

      settings.install_command,

      settings.build_command,

      settings.start_command,

      settings.port,
    ],
  );

  return result.rows[0];
};

module.exports = {
  getProjectSettings,

  updateProjectSettings,
};
