const deploymentService = require("../services/deployment.service");

const deployProject = async (req, res, next) => {
  try {
    const deployment = await deploymentService.deployProject(
      req.params.id,
      req.user.id,
    );

    res.status(201).json({
      success: true,
      data: deployment,
    });
  } catch (error) {
    next(error);
  }
};

const startProject = async (req, res, next) => {
  try {
    const result = await deploymentService.startProject(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const stopProject = async (req, res, next) => {
  try {
    const result = await deploymentService.stopProject(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const restartProject = async (req, res, next) => {
  try {
    const result = await deploymentService.restartProject(
      req.params.projectId,
      req.user.id,
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const redeployProject = async (req, res, next) => {
  try {
    const deployment = await deploymentService.redeployProject(
      req.params.projectId,
      req.user.id,
    );

    res.json(deployment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  deployProject,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
};
