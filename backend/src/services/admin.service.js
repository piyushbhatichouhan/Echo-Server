const userRepository = require("../repositories/user.repository");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

const getUsers = async () => {
  return await userRepository.getUsers();
};

const disableUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.is_owner) {
    throw new Error("Super Admin cannot be disabled");
  }

  return await userRepository.updateDisabledStatus(userId, true);
};

const enableUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return await userRepository.updateDisabledStatus(userId, false);
};

const deleteUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }
  if (user.is_owner) {
    throw new Error("Owner account cannot be deleted");
  }
  if (user.pending_deletion) {
    throw new Error("User is already scheduled for deletion");
  }

  await userRepository.scheduleUserDeletion(userId);

  return {
    success: true,
    message: "User scheduled for deletion.",
  };
};

const restoreUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.pending_deletion) {
    throw new Error("User is not pending deletion");
  }

  await userRepository.restoreUser(userId);

  return {
    success: true,
    message: "User restored successfully.",
  };
};

module.exports = {
  getUsers,
  disableUser,
  enableUser,
  deleteUser,
  restoreUser,
};
