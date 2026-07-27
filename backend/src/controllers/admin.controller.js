const adminService = require("../services/admin.service");

const getUsers = async (req, res, next) => {
  try {
    const users = await adminService.getUsers();

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

const disableUser = async (req, res, next) => {
  try {
    const user = await adminService.disableUser(req.params.id);

    res.json({
      success: true,
      message: "User disabled successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const enableUser = async (req, res, next) => {
  try {
    const user = await adminService.enableUser(req.params.id);

    res.json({
      success: true,
      message: "User enabled successfully",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const result = await adminService.restoreUser(req.params.id);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const updateStorageLimit = async (req, res, next) => {
  try {
    const user = await adminService.updateStorageLimit(
      req.params.id,
      req.body.storageLimit,
    );

    res.json({
      success: true,
      message: "Storage limit updated successfully.",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  disableUser,
  enableUser,
  deleteUser,
  restoreUser,
  updateStorageLimit,
};
