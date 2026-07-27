const serverService = require("../services/server.service");

const getPendingUsers = async (req, res, next) => {
  try {
    const users = await serverService.getPendingUsers();

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

const approveUser = async (req, res, next) => {
  try {
    const user = await serverService.approveUser(req.params.id);

    res.json({
      success: true,
      message: "User approved",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const rejectUser = async (req, res, next) => {
  try {
    const user = await serverService.rejectUser(req.params.id);

    res.json({
      success: true,
      message: "User rejected",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
};
