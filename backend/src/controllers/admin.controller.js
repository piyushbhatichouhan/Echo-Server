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

const toggleCustomSubdomainAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const updatedUser = await adminService.setCustomSubdomainAccess(
      id,
      enabled,
    );

    res.json({
      success: true,
      message: `Custom subdomain privilege ${enabled ? "granted" : "revoked"} successfully.`,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

const getSubdomainRequests = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const requests = await adminService.getSubdomainRequests({ status, search });
    res.json({
      success: true,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
};

const getSubdomainRequestStats = async (req, res, next) => {
  try {
    const stats = await adminService.getSubdomainRequestStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

const approveSubdomainRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const updated = await adminService.approveSubdomainRequest(id, adminId);
    res.json({
      success: true,
      message: `Subdomain "${updated.subdomain}" has been approved.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const rejectSubdomainRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body || {};
    const updated = await adminService.rejectSubdomainRequest(id, adminId, reason);
    res.json({
      success: true,
      message: `Subdomain request for "${updated.subdomain}" has been rejected.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

const deleteSubdomainRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteSubdomainRequest(id);
    res.json(result);
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
  updateUserQuota,
  toggleCustomSubdomainAccess,
  getSubdomainRequests,
  getSubdomainRequestStats,
  approveSubdomainRequest,
  rejectSubdomainRequest,
  deleteSubdomainRequest,
};
