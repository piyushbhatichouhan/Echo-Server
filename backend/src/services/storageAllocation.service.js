const serverSettingsRepository = require("../repositories/serverSettings.repository");
const diskService = require("./disk.service");
const userRepository = require("../repositories/user.repository");
const { pool } = require("../config/database");

const getStorageOverview = async () => {
  const settings = await serverSettingsRepository.getSettings();

  const disk = await diskService.getDiskInfo();

  const allocated = await serverSettingsRepository.getAllocatedStorage();

  const available = disk.size - settings.reserved_storage_bytes - allocated;

  return {
    total: disk.size,

    reserved: settings.reserved_storage_bytes,

    allocated,

    available,

    defaultQuota: settings.default_user_quota_bytes,
  };
};

const getAvailableAllocation = async () => {
  const overview = await getStorageOverview();

  return overview.available;
};

const canAllocate = async (bytes) => {
  const available = await getAvailableAllocation();

  return available >= bytes;
};

const allocateQuota = async (requestedBytes) => {
  const available = await getAvailableAllocation();

  return Math.min(requestedBytes, available);
};

const getDefaultQuota = async () => {
  const settings = await serverSettingsRepository.getSettings();

  return Number(settings.default_user_quota_bytes);
};

const updateSettings = async ({ reserved, defaultQuota }) => {
  const disk = await diskService.getDiskInfo();

  const allocated = await serverSettingsRepository.getAllocatedStorage();

  // Cannot reserve more than remaining disk
  if (reserved > disk.size - allocated) {
    throw new Error("Reserved storage exceeds available disk capacity.");
  }

  return await serverSettingsRepository.updateSettings({
    reserved_storage_bytes: reserved,
    default_user_quota_bytes: defaultQuota,
  });
};

const changeUserQuota = async (userId, newQuota) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const currentQuota = Number(user.quota_bytes);

  const difference = newQuota - currentQuota;

  if (newQuota < Number(user.used_bytes)) {
    throw new Error(
      "Quota cannot be lower than the user's current storage usage.",
    );
  }

  // Reducing quota is always allowed
  if (difference <= 0) {
    return await userRepository.updateUserQuota(userId, newQuota);
  }

  // Increasing quota requires free allocation
  const available = await getAvailableAllocation();

  if (difference > available) {
    throw new Error("Not enough storage available.");
  }

  return await userRepository.updateUserQuota(userId, newQuota);
};

const recalculateUserStorage = async (userId) => {
  try {
    const projectFilesResult = await pool.query(
      `
      SELECT COALESCE(SUM(f.file_size), 0) AS total_bytes
      FROM files f
      JOIN projects p ON f.project_id = p.id
      WHERE p.owner_id = $1
        AND f.is_directory = FALSE
      `,
      [userId],
    );

    const cloudFilesResult = await pool.query(
      `
      SELECT COALESCE(SUM(file_size), 0) AS total_bytes
      FROM cloud_files
      WHERE owner_id = $1
        AND is_directory = FALSE
        AND deleted_at IS NULL
      `,
      [userId],
    );

    const projectBytes = Number(projectFilesResult.rows[0]?.total_bytes || 0);
    const cloudBytes = Number(cloudFilesResult.rows[0]?.total_bytes || 0);
    const totalUsed = projectBytes + cloudBytes;

    await pool.query(
      `
      UPDATE users
      SET used_bytes = $2
      WHERE id = $1
      `,
      [userId, totalUsed],
    );

    return totalUsed;
  } catch (err) {
    console.error(`Failed to recalculate storage for user ${userId}:`, err);
    return 0;
  }
};

const reserveStorage = async (userId, bytes) => {
  const bytesNum = Math.max(0, Number(bytes) || 0);
  if (bytesNum === 0) return;

  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Owner accounts are not constrained by per-user quota
  if (!user.is_owner) {
    const used = Number(user.used_bytes || 0);
    const quota = Number(user.quota_bytes || 0);

    if (quota > 0 && used + bytesNum > quota) {
      throw new Error("Storage quota exceeded.");
    }
  }

  await userRepository.incrementUsedBytes(userId, bytesNum);
};

const releaseStorage = async (userId, bytes) => {
  const bytesNum = Math.max(0, Number(bytes) || 0);
  if (bytesNum === 0) return;

  await userRepository.decrementUsedBytes(userId, bytesNum);
};

const checkQuota = async (userId, incomingBytes) => {
  const bytesNum = Math.max(0, Number(incomingBytes) || 0);
  if (bytesNum === 0) return;

  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  // Owner accounts are not constrained by user quota, only physical disk
  if (user.is_owner) {
    const disk = await diskService.getDiskInfo().catch(() => null);
    if (disk && disk.free < bytesNum) {
      const error = new Error("Server disk is full.");
      error.status = 507;
      throw error;
    }
    return;
  }

  const used = Number(user.used_bytes || 0);
  const quota = Number(user.quota_bytes || 0);

  if (quota > 0 && used + bytesNum > quota) {
    const error = new Error("Storage quota exceeded.");
    error.status = 400;
    throw error;
  }
};

module.exports = {
  getStorageOverview,
  getAvailableAllocation,
  canAllocate,
  allocateQuota,
  getDefaultQuota,
  updateSettings,
  changeUserQuota,
  reserveStorage,
  releaseStorage,
  checkQuota,
  recalculateUserStorage,
};
