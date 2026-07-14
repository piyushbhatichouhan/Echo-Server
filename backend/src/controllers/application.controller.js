const applicationService = require("../services/application.service");

const saveApplication = async (req, res, next) => {
  try {
    const application = await applicationService.saveApplication(
      req.params.id,
      req.user.id,
      req.body,
    );

    res.json({
      success: true,
      message: "Application configuration saved successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const application = await applicationService.getApplication(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

const deleteApplication = async (req, res, next) => {
  try {
    const result = await applicationService.deleteApplication(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveApplication,
  getApplication,
  deleteApplication,
};
