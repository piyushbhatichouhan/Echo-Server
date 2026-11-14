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

const extractClientIp = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"] ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
    req.socket?.remoteAddress ||
    null
  );
};

const getOutboundIp = async (req, res, next) => {
  try {
    const refresh = req.query.refresh === "true" || req.query.refresh === "1";
    const clientIp = extractClientIp(req);
    const ip = await systemService.getOutboundIp(refresh, clientIp);

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
    const clientIp = extractClientIp(req);
    const guide = await systemService.getDeploymentGuide(clientIp);

    res.json({
      success: true,
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

const getCloudflareConfig = async (req, res, next) => {
  try {
    const cloudflareService = require("../services/cloudflare.service");
    const config = cloudflareService.getApiConfig();
    res.json({
      success: true,
      data: {
        isConfigured: config.isConfigured,
        zoneId: config.zoneId ? `${config.zoneId.slice(0, 6)}...` : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dockerInfo,
  getOutboundIp,
  getDeploymentGuide,
  getCloudflareConfig,
};
