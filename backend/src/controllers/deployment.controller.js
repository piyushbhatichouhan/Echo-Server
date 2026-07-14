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

const startProject = async (req, res) => {
  const result = await deploymentService.startProject(
    req.params.projectId,
    req.user.id,
  );

  res.json(result);
};

const stopProject = async (req, res) => {
  const result = await deploymentService.stopProject(
    req.params.projectId,
    req.user.id,
  );

  res.json(result);
};

const restartProject = async (req, res) => {
  const result = await deploymentService.restartProject(
    req.params.projectId,
    req.user.id,
  );

  res.json(result);
};

const redeployProject = async (req, res) => {
  const deployment = await deploymentService.redeployProject(
    req.params.projectId,
    req.user.id,
  );

  res.json(deployment);
};

module.exports = {
  deployProject,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
};
