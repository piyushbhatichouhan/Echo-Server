const { getHealthStatus } = require("../services/health.service");

const getHealth = async (req, res, next) => {
  try {
    const health = await getHealthStatus();

    res.status(200).json({
      success: true,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      ...health,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
};
