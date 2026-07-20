const { pool } = require("../config/database");

const createDeployment = async (projectId, imageName, containerName, port) => {
  const result = await pool.query(
    `
    INSERT INTO deployments
(
    project_id,
    image_name,
    container_name,
    port,
    status
)
VALUES
(
    $1,
    $2,
    $3,
    $4,
    'building'
)
RETURNING *
    `,
    [projectId, imageName, containerName, port],
  );

  return result.rows[0];
};

const updateDeploymentStatus = async (deploymentId, status) => {
  const result = await pool.query(
    `
  UPDATE deployments
  SET
      status = $2,
      updated_at = NOW()
  WHERE
      id = $1
  RETURNING *
  `,
    [deploymentId, status],
  );

  return result.rows[0];
};

const getLatestDeployment = async (projectId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM deployments
    WHERE project_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [projectId],
  );

  return result.rows[0];
};
const stopDeployments = async (projectId) => {
  await pool.query(
    `
    UPDATE deployments
    SET status = 'stopped'
    WHERE project_id = $1
      AND status = 'running'
    `,
    [projectId],
  );
};

const getProjectDeployments = async (projectId) => {
  const result = await pool.query(
    `
    SELECT
        id,
        image_name,
        container_name,
        port,
        status,
        created_at,
        updated_at
    FROM deployments
    WHERE project_id = $1
    ORDER BY created_at DESC
    `,
    [projectId],
  );

  return result.rows;
};

const getDeploymentById = async (deploymentId) => {
  const result = await pool.query(
    `
    SELECT
        id,
        project_id
    FROM deployments
    WHERE id = $1
    `,
    [deploymentId],
  );

  return result.rows[0];
};

const updateDeploymentImage = async (deploymentId, imageName) => {
  const result = await pool.query(
    `
    UPDATE deployments
    SET image_name = $2
    WHERE id = $1
    RETURNING *
    `,
    [deploymentId, imageName],
  );

  return result.rows[0];
};

const getRunningDeployments = async () => {
  const { rows } = await pool.query(`
        SELECT *
        FROM project_deployments
        WHERE status='running'
    `);

  return rows;
};

const markStoppedByUser = async (projectId, value) => {
  await pool.query(
    `
    UPDATE project_deployments
    SET stopped_by_user = $2
    WHERE project_id = $1
    `,
    [projectId, value],
  );
};
module.exports = {
  createDeployment,
  updateDeploymentStatus,
  getLatestDeployment,
  stopDeployments,
  getProjectDeployments,
  getDeploymentById,
  updateDeploymentImage,
  getRunningDeployments,
  markStoppedByUser,
};
