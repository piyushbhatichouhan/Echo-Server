const storageService = require("../services/storage.service");

const getOverview = async (req, res, next) => {
  try {
    const overview = await storageService.getOverview();

    res.json({
      success: true,
      data: overview,
    });
  } catch (err) {
    next(err);
  }
};

const getUsersStorage = async (req, res, next) => {
  try {
    const users = await storageService.getUsersStorage();

    res.json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

const getProjectsStorage = async (req, res, next) => {
  try {
    const projects = await storageService.getProjectsStorage();

    res.json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
};

const updateUserQuota = async (req, res) => {
  const userId = req.params.id;
  const { storageLimit } = req.body;

  const result = await storageService.updateUserQuota(userId, storageLimit);

  res.json({
    success: true,
    data: result,
  });
};

module.exports = {
  getOverview,
  getUsersStorage,
  getProjectsStorage,
  updateUserQuota,
};
