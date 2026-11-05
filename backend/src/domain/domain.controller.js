const projectService = require("../services/project.service");
const domainService = require("./domain.service");

const assign = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    await projectService.verifyProjectOwnership(projectId, req.user.id);

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
    const projectId = req.params.projectId;
    await projectService.verifyProjectOwnership(projectId, req.user.id);

    const domains = await domainService.getDomains(projectId);

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

