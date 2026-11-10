const deploymentService = require("../services/deployment.service");

const normalizeDeploymentError = (error) => {
  if (!error) return error;
  // Preserve circuit breaker capacity statuses (503 memory low, 507 disk low)
  if (error.status === 503 || error.status === 507) {
    return error;
  }
  // All other deployment/build/runtime errors are user application issues
  if (!error.status || error.status >= 500) {
    error.status = 400;
  }
  error.isUserError = true;
  return error;
};

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
    next(normalizeDeploymentError(error));
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
    next(normalizeDeploymentError(error));
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
    next(normalizeDeploymentError(error));
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
    next(normalizeDeploymentError(error));
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
    next(normalizeDeploymentError(error));
  }
};

module.exports = {
  deployProject,
  stopProject,
  startProject,
  restartProject,
  redeployProject,
};
