const userRepository = require("../repositories/user.repository");
const storageService = require("./storage.service");

const checkQuota = async (userId, incomingBytes = 0, replacingBytes = 0) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Unlimited storage
  if (user.storage_limit == null) {
    return true;
  }

  const used = await storageService.getUserStorageUsage(userId);

  const projectedUsage = used - replacingBytes + incomingBytes;

  if (projectedUsage > user.storage_limit) {
    const availableMB = Math.max(
      0,
      Math.round((user.storage_limit - used) / 1024 / 1024),
    );

    const error = new Error(
      `Not enough storage. Only ${availableMB} MB remaining.`,
    );
    error.status = 413;

    error.details = {
      used,
      limit: user.storage_limit,
      incoming: incomingBytes,
      available: Math.max(0, user.storage_limit - projectedUsage),
    };

    throw error;
  }

  return true;
};

module.exports = {
  checkQuota,
};
