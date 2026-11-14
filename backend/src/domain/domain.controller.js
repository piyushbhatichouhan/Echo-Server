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

const addCustomDomain = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    await projectService.verifyProjectOwnership(projectId, req.user.id);

    const { hostname } = req.body;
    const domain = await domainService.addCustomDomain(projectId, hostname);

    return res.status(201).json({
      success: true,
      data: domain,
      message: `Custom domain '${domain.hostname}' attached with automated SSL.`,
    });
  } catch (err) {
    next(err);
  }
};

const deleteCustomDomain = async (req, res, next) => {
  try {
    const { projectId, domainId } = req.params;
    await projectService.verifyProjectOwnership(projectId, req.user.id);

    const result = await domainService.deleteCustomDomain(projectId, domainId);

    return res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

const verifyCustomDomain = async (req, res, next) => {
  try {
    const { projectId, domainId } = req.params;
    await projectService.verifyProjectOwnership(projectId, req.user.id);

    const domain = await domainService.verifyCustomDomain(projectId, domainId);

    return res.json({
      success: true,
      data: domain,
      message: `Domain '${domain.hostname}' verified and SSL certificate provisioned.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assign,
  getDomains,
  addCustomDomain,
  deleteCustomDomain,
  verifyCustomDomain,
};

