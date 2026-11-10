const systemService = require("../services/system.service");

const dockerInfo = async (req, res, next) => {
  try {
    const info = await systemService.getDockerInfo();

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    next(error);
  }
};

const getOutboundIp = async (req, res, next) => {
  try {
    const ip = await systemService.getOutboundIp();

    res.json({
      success: true,
      data: {
        outboundIp: ip,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDeploymentGuide = async (req, res, next) => {
  try {
    const guide = await systemService.getDeploymentGuide();

    res.json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dockerInfo,
  getOutboundIp,
  getDeploymentGuide,
};
