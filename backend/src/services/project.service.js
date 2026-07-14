const { pool } = require("../config/database");
const portService = require("./port.service");
const projectCleanupService = require("./project-cleanup.service");

const createProject = async (ownerId, projectData) => {
  const { name, description } = projectData;

  const port = await portService.allocatePort();

  const result = await pool.query(
    `
       INSERT INTO projects
(
    owner_id,
    name,
    description,
    port
)
       VALUES
(
    $1,
    $2,   
    $3,
    $4
)
        RETURNING *
        `,
    [ownerId, name, description || null, port],
  );

  return result.rows[0];
};

const getProjects = async (ownerId) => {
  const result = await pool.query(
    `
    SELECT
    id,
    name,
    description,
    port,
    created_at,
    updated_at
        FROM projects
        WHERE owner_id = $1
        ORDER BY created_at DESC
        `,
    [ownerId],
  );

  return result.rows;
};

const getProjectById = async (projectId, ownerId) => {
  const result = await pool.query(
    `
     SELECT
    id,
    name,
    description,
    port,
    created_at,
    updated_at
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

  return result.rows[0];
};

const updateProject = async (projectId, ownerId, projectData) => {
  const { name, description } = projectData;

  const result = await pool.query(
    `
        UPDATE projects
        SET
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            updated_at = NOW()
        WHERE
            id = $1
            AND owner_id = $2
        RETURNING
            id,
            owner_id,
            name,
            description,
            created_at,
            updated_at
        `,
    [projectId, ownerId, name ?? null, description ?? null],
  );

  if (result.rows.length === 0) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const deleteProject = async (projectId, ownerId) => {
  await verifyProjectOwnership(projectId, ownerId);

  await projectCleanupService.cleanupProject(projectId);

  const result = await pool.query(
    `
        DELETE FROM projects
        WHERE
            id = $1
        AND
            owner_id = $2
        RETURNING
            id,
            name
        `,
    [projectId, ownerId],
  );

  if (result.rows.length === 0) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }

  return result.rows[0];
};

const verifyProjectOwnership = async (projectId, ownerId) => {
  const project = await pool.query(
    `
        SELECT id
        FROM projects
        WHERE id = $1
        AND owner_id = $2
        `,
    [projectId, ownerId],
  );

  if (project.rows.length === 0) {
    const error = new Error("Project not found");
    error.status = 404;
    throw error;
  }
};

const updateProjectPort = async (projectId, port) => {
  const result = await pool.query(
    `
    UPDATE projects
    SET port = $2
    WHERE id = $1
    RETURNING *
    `,
    [projectId, port],
  );

  return result.rows[0];
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  verifyProjectOwnership,
  updateProjectPort,
};
