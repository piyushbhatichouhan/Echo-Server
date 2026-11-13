const { pool } = require("../config/database");

const projectCleanupService = require("./project-cleanup.service");

const { getRuntimePreset } = require("../config/runtimePresets");

const projectSettingsRepository = require("../repositories/projectSettings.repository");

const createProject = async (ownerId, projectData) => {
  const { name, description, applicationType } = projectData;

  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    const error = new Error("Project name is required.");
    error.status = 400;
    error.isUserError = true;
    throw error;
  }

  // Enforce unique project name per account (case-insensitive)
  const existing = await pool.query(
    `
    SELECT id, name
    FROM projects
    WHERE owner_id = $1 AND LOWER(TRIM(name)) = LOWER($2)
    LIMIT 1
    `,
    [ownerId, trimmedName],
  );

  if (existing.rows.length > 0) {
    const error = new Error(`A project named "${trimmedName}" already exists in your account.`);
    error.status = 409;
    error.isUserError = true;
    throw error;
  }

  // Enforce max projects cap per account (unless owner)
  const userCheck = await pool.query(
    "SELECT id, is_owner, COALESCE(max_projects, 5) AS max_projects FROM users WHERE id = $1",
    [ownerId],
  );
  const userRow = userCheck.rows[0];
  if (userRow && !userRow.is_owner) {
    const countCheck = await pool.query(
      "SELECT COUNT(*) AS count FROM projects WHERE owner_id = $1",
      [ownerId],
    );
    const currentCount = parseInt(countCheck.rows[0]?.count || 0, 10);
    const maxAllowed = userRow.max_projects;
    if (currentCount >= maxAllowed) {
      const error = new Error(
        `Project limit reached (${currentCount}/${maxAllowed}). Delete an existing project or contact superadmin to increase your project allowance.`,
      );
      error.status = 403;
      error.isUserError = true;
      throw error;
    }
  }

  const preset = getRuntimePreset(applicationType);

  if (!preset) {
    throw new Error("Invalid application type.");
  }

  let result;
  try {
    result = await pool.query(
      `
      INSERT INTO projects
      (
          owner_id,
          name,
          application_type,
          description
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
      [ownerId, trimmedName, applicationType, description ? description.trim() : null],
    );
  } catch (dbErr) {
    if (dbErr.code === "23505" || dbErr.message?.includes("projects_owner_name")) {
      const error = new Error(`A project named "${trimmedName}" already exists in your account.`);
      error.status = 409;
      error.isUserError = true;
      throw error;
    }
    throw dbErr;
  }

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
    d.port,
    d.commit_hash,
    d.commit_message,
    d.updated_at AS last_deployment
FROM projects p
LEFT JOIN LATERAL (
    SELECT
        status,
        port,
        commit_hash,
        commit_message,
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

  let trimmedName = undefined;
  if (name !== undefined && name !== null) {
    trimmedName = String(name).trim();
    if (!trimmedName) {
      const error = new Error("Project name cannot be empty.");
      error.status = 400;
      error.isUserError = true;
      throw error;
    }

    // Check if another project owned by this user already has this name (case-insensitive)
    const existing = await pool.query(
      `
      SELECT id, name
      FROM projects
      WHERE owner_id = $1 AND id != $2 AND LOWER(TRIM(name)) = LOWER($3)
      LIMIT 1
      `,
      [ownerId, projectId, trimmedName],
    );

    if (existing.rows.length > 0) {
      const error = new Error(`A project named "${trimmedName}" already exists in your account.`);
      error.status = 409;
      error.isUserError = true;
      throw error;
    }
  }

  let result;
  try {
    result = await pool.query(
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
      [projectId, ownerId, trimmedName ?? null, description !== undefined ? description?.trim() : null],
    );
  } catch (dbErr) {
    if (dbErr.code === "23505" || dbErr.message?.includes("projects_owner_name")) {
      const error = new Error(`A project named "${trimmedName}" already exists in your account.`);
      error.status = 409;
      error.isUserError = true;
      throw error;
    }
    throw dbErr;
  }

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const verifyProjectOwnership = async (projectId, ownerId) => {
  if (!projectId || !UUID_REGEX.test(String(projectId))) {
    const error = new Error("Invalid project ID");
    error.status = 400;
    throw error;
  }

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
    const error = new Error("Project not found");
    error.status = 404;
    error.isUserError = true;
    throw error;
  }

  return result.rows[0];
};

const deleteProjectCompletelyInternal = async (projectId, client) => {
  await projectCleanupService.cleanupProject(projectId);

  await projectRepository.deleteProjectRecordTx(client, projectId);
};

const updateApplicationType = async (projectId, applicationType) => {
  if (!applicationType) return;
  await pool.query(
    `
    UPDATE projects
    SET application_type = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [projectId, applicationType],
  );
};

const getUserResourceMetrics = async (userId) => {
  const userCheck = await pool.query(
    `SELECT id, is_owner, COALESCE(ram_limit_mb, 512) AS ram_limit_mb,
            COALESCE(max_active_projects, 2) AS max_active_projects,
            COALESCE(max_projects, 5) AS max_projects,
            COALESCE(quota_bytes, 0) AS quota_bytes,
            COALESCE(used_bytes, 0) AS used_bytes
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = userCheck.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const projectsRes = await pool.query(
    `
    SELECT p.id, p.name, p.application_type, COALESCE(d.status, 'Not Deployed') AS status
    FROM projects p
    LEFT JOIN LATERAL (
      SELECT status FROM deployments WHERE project_id = p.id ORDER BY updated_at DESC LIMIT 1
    ) d ON TRUE
    WHERE p.owner_id = $1
    ORDER BY p.updated_at DESC
    `,
    [userId],
  );
  const projects = projectsRes.rows;

  const runningProjects = projects.filter(
    (p) => (p.status || "").toLowerCase() === "running",
  );

  const containerService = require("./container.service");
  let totalMemoryUsedBytes = 0;
  let totalCpuPercent = 0;
  const runningContainers = [];

  await Promise.all(
    runningProjects.map(async (p) => {
      try {
        const tel = await containerService.getContainerTelemetry(p.id);
        if (tel && tel.running) {
          totalMemoryUsedBytes += tel.memoryUsed || 0;
          totalCpuPercent += tel.cpuPercent || 0;
          runningContainers.push({
            projectId: p.id,
            name: p.name,
            memoryUsed: tel.memoryUsed,
            cpuPercent: tel.cpuPercent,
          });
        }
      } catch (err) {
        // Container may be offline or transitional
      }
    }),
  );

  const isOwner = Boolean(user.is_owner);
  const ramLimitMb = isOwner ? null : Number(user.ram_limit_mb);
  const maxActiveProjects = isOwner ? null : Number(user.max_active_projects);
  const maxProjects = isOwner ? null : Number(user.max_projects);

  const usedRamMb =
    Math.round((totalMemoryUsedBytes / (1024 * 1024)) * 10) / 10;
  const ramPercentage =
    ramLimitMb && ramLimitMb > 0
      ? Math.min(100, Math.round((usedRamMb / ramLimitMb) * 100))
      : 0;

  const activeCount = runningProjects.length;
  const effectiveCpuPercent =
    activeCount > 0
      ? Math.min(100, Math.round((totalCpuPercent / activeCount) * 10) / 10)
      : 0;

  return {
    isOwner,
    limits: {
      ramLimitMb,
      maxActiveProjects,
      maxProjects,
      quotaBytes: Number(user.quota_bytes),
    },
    usage: {
      totalProjects: projects.length,
      activeProjects: activeCount,
      usedRamMb,
      ramPercentage,
      cpuPercent: effectiveCpuPercent,
      usedStorageBytes: Number(user.used_bytes),
    },
    runningContainers,
  };
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
  updateApplicationType,
  getUserResourceMetrics,
};
