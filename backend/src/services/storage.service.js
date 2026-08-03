const filesystem = require("./filesystem.service");
const fs = require("fs/promises");
const path = require("path");
const projectRepository = require("../repositories/project.repository");
const storage = require("../config/storage");
const os = require("os");
const userRepository = require("../repositories/user.repository");

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
  const projectsUsed = await getUserStorageUsage(userId);
  const cloudRoot = path.join(storage.cloud, userId);
  let cloudUsed = 0;

  try {
    cloudUsed = await filesystem.calculateDirectorySize(cloudRoot);
  } catch {
    cloudUsed = 0;
  }
  const used = projectsUsed + cloudUsed;

  const limit = user.quota_bytes == null ? 0 : Number(user.quota_bytes);

  const free = Math.max(0, limit - used);

  const projects = await projectRepository.getProjectsByOwner(userId);

  return {
    used,
    limit,
    free,
    projectsUsed,
    cloudUsed,
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
