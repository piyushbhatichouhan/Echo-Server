const { pool } = require("../config/database");

const createDeployment = async (
  projectId,
  imageName,
  containerName,
  port,
  gitMeta = {},
) => {
  const {
    commitHash = null,
    commitMessage = null,
    commitAuthor = null,
    gitBranch = null,
  } = gitMeta || {};

  const result = await pool.query(
    `
    INSERT INTO deployments
    (
        project_id,
        image_name,
        container_name,
        port,
        status,
        commit_hash,
        commit_message,
        commit_author,
        git_branch
    )
    VALUES
    (
        $1,
        $2,
        $3,
        $4,
        'building',
        $5,
        $6,
        $7,
        $8
    )
    RETURNING *
    `,
    [
      projectId,
      imageName,
      containerName,
      port,
      commitHash,
      commitMessage,
      commitAuthor,
      gitBranch,
    ],
  );

  return result.rows[0];
};

const updateDeploymentStatus = async (deploymentId, status) => {
  const result = await pool.query(
    `
  UPDATE deployments
  SET
      status = $2,
      port = CASE WHEN $2 IN ('stopped', 'failed') THEN NULL ELSE port END,
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
const stopDeployments = async (projectId, exceptDeploymentId = null) => {
  if (exceptDeploymentId) {
    await pool.query(
      `
      UPDATE deployments
      SET status = 'stopped', port = NULL
      WHERE project_id = $1
        AND status = 'running'
        AND id != $2
      `,
      [projectId, exceptDeploymentId],
    );
  } else {
    await pool.query(
      `
      UPDATE deployments
      SET status = 'stopped', port = NULL
      WHERE project_id = $1
        AND status = 'running'
      `,
      [projectId],
    );
  }
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
        commit_hash,
        commit_message,
        commit_author,
        git_branch,
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
    SELECT *
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

const updateDeploymentContainer = async (
  deploymentId,
  containerId,
  containerName,
  containerPort,
) => {
  console.log("Updating deployment:", deploymentId);
  console.log("Setting container:", containerName);
  const result = await pool.query(
    `
        UPDATE deployments
        SET
            container_id=$2,
            container_name=$3,
            container_port=$4
        WHERE id=$1
        RETURNING *
        `,
    [deploymentId, containerId, containerName, containerPort],
  );
  console.log(result.rows);
  return result.rows[0];
};

const updateDeploymentPort = async (deploymentId, port) => {
  const result = await pool.query(
    `
    UPDATE deployments
    SET port = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [deploymentId, port],
  );

  return result.rows[0];
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
  updateDeploymentContainer,
  updateDeploymentPort,
};

