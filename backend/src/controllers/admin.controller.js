const adminService = require("../services/admin.service");
const storageAllocationService = require("../services/storageAllocation.service");

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

const updateUserQuota = async (req, res, next) => {
  try {
    const quota = Number(req.body.quota);

    if (Number.isNaN(quota) || quota < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quota.",
      });
    }

    const user = await storageAllocationService.changeUserQuota(
      req.params.id,
      quota,
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  disableUser,
  enableUser,
  deleteUser,
  restoreUser,

  updateUserQuota,
};
