const domainService = require("./domain.service");

const assign = async (req, res, next) => {
  try {
    const { projectId } = req.body;

    const domain = await domainService.assign(projectId);

    return res.json({
      success: true,
      data: domain,
    });
  } catch (err) {
    next(err);
  }
};

const getDomains = async (req, res, next) => {
  try {
    const domains = await domainService.getDomains(req.params.projectId);

    return res.json({
      success: true,
      data: domains,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assign,
  getDomains,
};
