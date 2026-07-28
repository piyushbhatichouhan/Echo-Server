const storageAllocationService = require("../services/storageAllocation.service");

const getStorageOverview = async (req, res, next) => {
  try {
    const overview = await storageAllocationService.getStorageOverview();

    res.json({
      success: true,
      data: overview,
    });
  } catch (err) {
    next(err);
  }
};

const updateStorageSettings = async (req, res, next) => {
  try {
    const settings = await storageAllocationService.updateSettings({
      reserved: req.body.reserved,
      defaultQuota: req.body.defaultQuota,
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStorageOverview,
  updateStorageSettings,
};
