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

const portService = require("../services/port.service");

const cleanupPorts = async (req, res, next) => {
  try {
    const released = await portService.cleanupPseudoPorts();
    res.json({
      success: true,
      message: `Cleaned up ${released} pseudo-allocated ports.`,
      releasedCount: released,
    });
  } catch (err) {
    next(err);
  }
};

const serverHealthService = require("../services/serverHealth.service");
const serverLogService = require("../services/serverLog.service");

const getServerHealth = async (req, res, next) => {
  try {
    const health = await serverHealthService.getServerHealth();
    res.json({
      success: true,
      data: health,
    });
  } catch (err) {
    next(err);
  }
};

const getServerLogs = async (req, res, next) => {
  try {
    const { category, level, search, limit, containerId } = req.query;
    const result = await serverLogService.getServerLogs({
      category,
      level,
      search,
      limit,
      containerId,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getLogContainers = async (req, res, next) => {
  try {
    const containers = await serverLogService.getDockerContainers();
    res.json({
      success: true,
      data: containers,
    });
  } catch (err) {
    next(err);
  }
};

const clearServerLogs = async (req, res, next) => {
  try {
    const result = serverLogService.clearServerLogs();
    res.json({
      success: true,
      message: `Cleared ${result.clearedCount} in-memory log entries.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  cleanupPorts,
  getServerHealth,
  getServerLogs,
  getLogContainers,
  clearServerLogs,
};
