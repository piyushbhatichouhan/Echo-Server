const serverSettingsRepository = require("../repositories/serverSettings.repository");
const diskService = require("./disk.service");
const userRepository = require("../repositories/user.repository");

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

const reserveStorage = async (userId, bytes) => {
  const user = await userRepository.getUserById(userId);

  const used = Number(user.used_bytes);
  const quota = Number(user.quota_bytes);

  if (used + bytes > quota) {
    throw new Error("Storage quota exceeded.");
  }

  await userRepository.incrementUsedBytes(userId, bytes);
};

const releaseStorage = async (userId, bytes) => {
  await userRepository.decrementUsedBytes(userId, bytes);
};

const checkQuota = async (userId, incomingBytes) => {
  const user = await userRepository.getUserById(userId);

  const used = Number(user.used_bytes);

  const quota = Number(user.quota_bytes);

  if (used + incomingBytes > quota) {
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
};
