const { getDockerInfo } = require("../services/system.service");

const dockerInfo = async (req, res, next) => {
  try {
    const info = await getDockerInfo();

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  dockerInfo,
};
