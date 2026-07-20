const projectSettingsService = require("../services/projectSettings.service");

const getProjectSettings = async (req, res, next) => {
  try {
    const settings = await projectSettingsService.getProjectSettings(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const updateProjectSettings = async (req, res, next) => {
  try {
    const settings = await projectSettingsService.updateProjectSettings(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectSettings,
  updateProjectSettings,
};
