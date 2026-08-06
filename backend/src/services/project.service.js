const { pool } = require("../config/database");

const projectCleanupService = require("./project-cleanup.service");

const { getRuntimePreset } = require("../config/runtimePresets");

const projectSettingsRepository = require("../repositories/projectSettings.repository");

const createProject = async (ownerId, projectData) => {
  const { name, description, applicationType } = projectData;

  const preset = getRuntimePreset(applicationType);

  if (!preset) {
    throw new Error("Invalid application type.");
  }

  const result = await pool.query(
    `
    INSERT INTO projects
    (
        owner_id,
        name,
        application_type,
        description,
        
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
    [ownerId, name, applicationType, description || null],
  );

  const project = result.rows[0];

  await projectSettingsRepository.createProjectSettings(project.id, {
    ...preset,
  });

  return project;
};

const getProjects = async (ownerId) => {
  const result = await pool.query(
    `
    SELECT

    p.id,

    p.name,

    p.description,

    p.application_type,

    

    p.created_at,

    p.updated_at,

    p.git_connected,

    p.git_branch,

    p.git_remote_url,

    COALESCE(d.status,'Not Deployed') AS status,

    d.updated_at AS last_deployment

FROM projects p

LEFT JOIN LATERAL (

    SELECT

        status,

        updated_at

    FROM deployments

    WHERE project_id = p.id

    ORDER BY updated_at DESC

    LIMIT 1

) d ON TRUE

WHERE p.owner_id = $1

ORDER BY p.updated_at DESC;
    `,
    [ownerId],
  );

  return result.rows;
};

const getProjectById = async (projectId, ownerId) => {
  const result = await pool.query(
    `
SELECT

    p.id,
    p.name,
    p.description,
    p.application_type,
    
    p.created_at,
    p.updated_at,
    p.git_connected,
    p.git_branch,
    p.git_remote_url,

    u.username,

    COALESCE(d.status,'Not Deployed') AS status,
    d.updated_at AS last_deployment,

    pd.hostname,
    pd.custom_domain,
    pd.publication_status,
    pd.ssl_status,
    pd.verification_status

FROM projects p

JOIN users u
ON u.id = p.owner_id

LEFT JOIN deployments d
ON d.project_id = p.id

LEFT JOIN project_domains pd
ON pd.project_id = p.id
AND pd.is_primary = TRUE

WHERE
    p.id = $1
AND p.owner_id = $2;
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

  return await deleteProjectInternal(projectId);
};

const deleteProjectInternal = async (projectId) => {
  await projectCleanupService.cleanupProject(projectId);

  return await deleteProjectRecord(projectId);
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

const deleteProjectRecord = async (projectId) => {
  const result = await pool.query(
    `
    DELETE FROM projects
    WHERE id = $1
    RETURNING id, name
    `,
    [projectId],
  );

  if (result.rows.length === 0) {
    throw new Error("Project not found");
  }

  return result.rows[0];
};

const deleteProjectCompletelyInternal = async (projectId, client) => {
  await projectCleanupService.cleanupProject(projectId);

  await projectRepository.deleteProjectRecordTx(client, projectId);
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  verifyProjectOwnership,
  deleteProjectInternal,
  deleteProjectRecord,
  deleteProjectCompletelyInternal,
};
