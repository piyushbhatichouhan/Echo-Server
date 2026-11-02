const filesystem = require("./filesystem.service");
const fs = require("fs/promises");
const path = require("path");
const projectRepository = require("../repositories/project.repository");
const storage = require("../config/storage");
const os = require("os");
const userRepository = require("../repositories/user.repository");
const diskService = require("./disk.service");
const { pool } = require("../config/database");

const getOverview = async () => {
  const projects = await getStorageCategorySize(storage.projects);

  const git = await getStorageCategorySize(storage.git);

  const cloud = await getStorageCategorySize(storage.cloud);

  const backups = await getStorageCategorySize(storage.backups);
  const stats = await fs.statfs(storage.projects);

  const totalDisk = stats.blocks * stats.bsize;

  const freeDisk = stats.bavail * stats.bsize;

  const usedDisk = totalDisk - freeDisk;
  return {
    totalDisk,
    usedDisk,
    freeDisk,

    projects,
    git,
    cloud,
    backups,
  };
};

const getProjectStorageUsage = async (projectId) => {
  const projectRoot = path.join(storage.projects, projectId.toString());

  return await filesystem.calculateDirectorySize(projectRoot);
};
const getUserStorageUsage = async (userId) => {
  const projects = await projectRepository.getProjectsByOwner(userId);

  let total = 0;

  for (const project of projects) {
    total += await getProjectStorageUsage(project.id);
  }

  return total;
};

const getUserStorageStats = async (userId) => {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let projectsUsed = await getUserStorageUsage(userId);
  if (projectsUsed === 0) {
    // Fallback to database files table if disk folders are empty or unmounted
    const res = await pool.query(
      `
      SELECT COALESCE(SUM(f.file_size), 0) AS total
      FROM files f
      JOIN projects p ON f.project_id = p.id
      WHERE p.owner_id = $1
        AND f.is_directory = FALSE
      `,
      [userId],
    );
    projectsUsed = Number(res.rows[0]?.total || 0);
  }

  const cloudRoot = path.join(storage.cloud, userId);
  let cloudUsed = 0;

  try {
    cloudUsed = await filesystem.calculateDirectorySize(cloudRoot);
  } catch {
    cloudUsed = 0;
  }

  if (cloudUsed === 0) {
    // Fallback to database cloud_files table
    const res = await pool.query(
      `
      SELECT COALESCE(SUM(file_size), 0) AS total
      FROM cloud_files
      WHERE owner_id = $1
        AND is_directory = FALSE
        AND deleted_at IS NULL
      `,
      [userId],
    );
    cloudUsed = Number(res.rows[0]?.total || 0);
  }

  const used = projectsUsed + cloudUsed;

  // Auto-synchronize users.used_bytes to ground truth
  if (Number(user.used_bytes || 0) !== used) {
    await pool.query(
      `
      UPDATE users
      SET used_bytes = $2
      WHERE id = $1
      `,
      [userId, used],
    ).catch(() => {});
  }

  let limit;
  let free;

  if (user.is_owner) {
    // Owner is bound by server disk capacity
    const disk = await diskService.getDiskInfo().catch(() => ({ size: 0, free: 0 }));
    limit = disk.size || 0;
    free = disk.free || 0;
  } else {
    limit = user.quota_bytes == null ? 0 : Number(user.quota_bytes);
    free = Math.max(0, limit - used);
  }

  return {
    used,
    limit,
    free,
    projectsUsed,
    cloudUsed,
    isOwner: !!user.is_owner,
  };
};

const getStorageCategorySize = async (directory) => {
  if (!directory) {
    return 0;
  }

  return await filesystem.calculateDirectorySize(directory);
};

const getUsersStorage = async () => {
  const users = await userRepository.getUsersForStorage();

  const result = [];

  for (const user of users) {
    const stats = await getUserStorageStats(user.id);

    result.push({
      id: user.id,
      username: user.username,
      email: user.email,

      quotaBytes: stats.limit,
      usedBytes: stats.used,

      disabled: user.disabled,
      pendingDeletion: user.pending_deletion,
    });
  }

  return result;
};

const getProjectsStorage = async () => {
  const projects = await projectRepository.getProjects();

  const result = [];

  for (const project of projects) {
    const size = await getProjectStorageUsage(project.id);

    result.push({
      id: project.id,
      name: project.name,
      ownerId: project.owner_id,
      used: size,
    });
  }

  return result;
};

const updateUserQuota = async (userId, quotaBytes) => {
  return await userRepository.updateUserQuota(userId, quotaBytes);
};

module.exports = {
  getProjectStorageUsage,
  getUserStorageUsage,
  getOverview,
  getStorageCategorySize,
  getUsersStorage,
  getProjectsStorage,
  updateUserQuota,
  getUserStorageStats,
};
