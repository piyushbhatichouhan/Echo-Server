const fs = require("fs/promises");
const path = require("path");
const docker = require("../docker/docker.client");
const containerService = require("./container.service");
const imageService = require("./image.service");
const { removeProjectDirectory } = require("./file.service");
const routingService = require("../routing/routing.service");
const { pool } = require("../config/database");
const storageAllocation = require("./storageAllocation.service");
const portService = require("./port.service");
const {
  getProjectFilesRoot,
  getProjectBuildRoot,
  getProjectRuntimeRoot,
  getProjectLogsRoot,
} = require("../storage/project.storage.manager");
const { getGitRoot } = require("../storage/git.storage.manager");

/**
 * Completely deletes a project when the project itself is deleted.
 */
const cleanupProject = async (projectId) => {
  // 1. Stop running container
  try {
    await containerService.stopContainerByProject(projectId);
  } catch {}

  // 2. Remove container
  try {
    await containerService.removeContainerByProject(projectId);
  } catch {}

  // 3. Remove docker image
  try {
    await imageService.removeImage(imageService.getImageName(projectId));
  } catch {}

  // 4. Remove routing
  try {
    console.log(`ProjectId: ${projectId}`);
    await routingService.unpublish({
      projectId,
    });
  } catch {}

  // 5. Delete project files
  try {
    await removeProjectDirectory(projectId);
  } catch {}
};

/**
 * Resets all files and Docker state when a user connects a different repository.
 * - Deletes all existing workspace and build files
 * - Clears files table in database and releases storage quota
 * - Stops and forcibly removes all project containers
 * - Removes all project Docker images
 * - Clears Docker builder cache and dangling image layers
 * - Resets deployments and frees allocated ports
 * - Unpublishes routing proxy
 */
const resetProjectFilesAndDocker = async (projectId, ownerId = null) => {
  console.log(`[ProjectReset] Starting complete reset of files and Docker for project ${projectId}...`);

  // Resolve project owner if not provided
  let effectiveOwnerId = ownerId;
  if (!effectiveOwnerId) {
    try {
      const ownerRes = await pool.query(
        `SELECT owner_id FROM projects WHERE id = $1`,
        [projectId],
      );
      effectiveOwnerId = ownerRes.rows[0]?.owner_id || null;
    } catch {}
  }

  // ----------------------------------------------------
  // 1. STOP & FORCIBLY REMOVE ALL CONTAINERS FOR PROJECT
  // ----------------------------------------------------
  try {
    await containerService.stopContainerByProject(projectId);
  } catch (err) {
    console.warn(`[ProjectReset] stopContainerByProject warning:`, err.message);
  }
  try {
    await containerService.removeContainerByProject(projectId);
  } catch (err) {
    console.warn(`[ProjectReset] removeContainerByProject warning:`, err.message);
  }
  try {
    await containerService.removePreviousContainers(projectId);
  } catch (err) {
    console.warn(`[ProjectReset] removePreviousContainers warning:`, err.message);
  }

  // Scan Docker directly to catch any containers matching project prefixes
  try {
    const containers = await docker.listContainers({ all: true });
    const pIdStr = String(projectId);
    for (const c of containers) {
      const names = c.Names || [];
      const matches = names.some(
        (n) =>
          n.includes(`echoserver-${pIdStr}`) ||
          n.includes(`echohub-${pIdStr}`) ||
          n.includes(`echo-project-${pIdStr}`) ||
          n.includes(`echo_${pIdStr}`),
      );
      if (matches) {
        console.log(`[ProjectReset] Removing lingering container ${c.Id.slice(0, 12)} (${names.join(", ")})`);
        try {
          const cont = docker.getContainer(c.Id);
          await cont.stop({ t: 1 }).catch(() => {});
          await cont.remove({ force: true }).catch(() => {});
        } catch {}
      }
    }
  } catch (err) {
    console.warn(`[ProjectReset] Docker container scan warning:`, err.message);
  }

  // ----------------------------------------------------
  // 2. REMOVE ALL DOCKER IMAGES FOR THIS PROJECT
  // ----------------------------------------------------
  try {
    await imageService.removeImage(imageService.getImageName(projectId));
  } catch {}

  try {
    const images = await docker.listImages({ all: true });
    const targetTagPrefix = `echoserver-${projectId}`;
    for (const img of images) {
      const tags = img.RepoTags || [];
      const matches = tags.some((t) => t.includes(targetTagPrefix));
      if (matches) {
        console.log(`[ProjectReset] Removing Docker image ${img.Id.slice(0, 12)} (${tags.join(", ")})`);
        try {
          const dockerImg = docker.getImage(img.Id);
          await dockerImg.remove({ force: true });
        } catch (imgErr) {
          console.warn(`[ProjectReset] Could not remove image ${img.Id.slice(0, 12)}:`, imgErr.message);
        }
      }
    }
  } catch (err) {
    console.warn(`[ProjectReset] Docker images scan warning:`, err.message);
  }

  // ----------------------------------------------------
  // 3. CLEAR DOCKER BUILDER CACHE AND DANGLING LAYERS
  // ----------------------------------------------------
  try {
    if (typeof docker.pruneBuilder === "function") {
      const buildRes = await docker.pruneBuilder();
      if (buildRes?.SpaceReclaimed) {
        console.log(`[ProjectReset] Pruned builder cache: ${buildRes.SpaceReclaimed} bytes`);
      }
    }
  } catch (err) {
    console.warn(`[ProjectReset] Prune builder cache warning:`, err.message);
  }

  try {
    await docker.pruneImages({ filters: { dangling: { true: true } } });
  } catch (err) {}

  try {
    await docker.pruneContainers();
  } catch (err) {}

  // ----------------------------------------------------
  // 4. UNPUBLISH ROUTING / PROXY
  // ----------------------------------------------------
  try {
    await routingService.unpublish({ projectId });
  } catch (err) {
    console.warn(`[ProjectReset] Routing unpublish notice:`, err.message);
  }

  // ----------------------------------------------------
  // 5. RESET DEPLOYMENT RECORDS IN DB & FREE PORTS
  // ----------------------------------------------------
  try {
    await pool.query(
      `UPDATE deployments 
       SET status = 'stopped', port = NULL, updated_at = NOW() 
       WHERE project_id = $1`,
      [projectId],
    );
  } catch (err) {
    console.warn(`[ProjectReset] Deployments table update warning:`, err.message);
  }

  try {
    await pool.query(
      `UPDATE project_deployments 
       SET status = 'not_deployed', process_id = NULL, container_id = NULL, port = NULL, updated_at = NOW() 
       WHERE project_id = $1`,
      [projectId],
    );
  } catch {}

  try {
    await portService.cleanupPseudoPorts();
  } catch (err) {}

  // Reset custom commands so the new repository starts with clean auto-detection
  try {
    await pool.query(
      `UPDATE project_settings 
       SET install_command = NULL, build_command = NULL, start_command = NULL, dockerfile = NULL, updated_at = NOW() 
       WHERE project_id = $1`,
      [projectId],
    );
  } catch {}

  // ----------------------------------------------------
  // 6. DELETE EXISTING FILES AND RECONCILE STORAGE QUOTA
  // ----------------------------------------------------
  let totalBytes = 0;
  try {
    const sizeRes = await pool.query(
      `SELECT COALESCE(SUM(file_size), 0) AS total_bytes FROM files WHERE project_id = $1`,
      [projectId],
    );
    totalBytes = Number(sizeRes.rows[0]?.total_bytes || 0);
  } catch {}

  // Delete all records from `files` table for this project
  try {
    await pool.query(`DELETE FROM files WHERE project_id = $1`, [projectId]);
  } catch (err) {
    console.warn(`[ProjectReset] Failed to clear files table:`, err.message);
  }

  // Release storage quota
  if (effectiveOwnerId && totalBytes > 0) {
    try {
      await storageAllocation.releaseStorage(effectiveOwnerId, totalBytes);
    } catch {}
  }
  if (effectiveOwnerId && storageAllocation.recalculateUserStorage) {
    try {
      await storageAllocation.recalculateUserStorage(effectiveOwnerId);
    } catch {}
  }

  // Wipe filesystem workspace files directory and recreate empty
  const filesDir = getProjectFilesRoot(projectId);
  try {
    await fs.rm(filesDir, { recursive: true, force: true });
    await fs.mkdir(filesDir, { recursive: true });
  } catch (err) {
    console.warn(`[ProjectReset] Error resetting files directory ${filesDir}:`, err.message);
  }

  // Wipe build context directory and recreate empty
  const buildDir = getProjectBuildRoot(projectId);
  try {
    await fs.rm(buildDir, { recursive: true, force: true });
    await fs.mkdir(buildDir, { recursive: true });
  } catch {}

  // Wipe runtime directory and recreate empty
  const runtimeDir = getProjectRuntimeRoot(projectId);
  try {
    await fs.rm(runtimeDir, { recursive: true, force: true });
    await fs.mkdir(runtimeDir, { recursive: true });
  } catch {}

  // Wipe git clone directory and recreate empty
  const gitDir = getGitRoot(projectId);
  try {
    await fs.rm(gitDir, { recursive: true, force: true });
    await fs.mkdir(gitDir, { recursive: true });
  } catch {}

  // Wipe logs directory and recreate empty
  const logsDir = getProjectLogsRoot(projectId);
  try {
    await fs.rm(logsDir, { recursive: true, force: true });
    await fs.mkdir(logsDir, { recursive: true });
  } catch {}

  console.log(`[ProjectReset] Complete: Project ${projectId} files wiped and Docker environment fully reset.`);
  return { success: true };
};

module.exports = {
  cleanupProject,
  resetProjectFilesAndDocker,
};
