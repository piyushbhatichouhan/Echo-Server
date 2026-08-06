const deploymentRepository = require("../../../repositories/deployment.repository");
const portService = require("../../port.service");

const create = async (projectId, image, container) => {
  const hostPort = await portService.getAvailablePort();

  return deploymentRepository.createDeployment(
    projectId,
    image,
    container,
    hostPort,
  );
};

const stopPreviousDeployments = async (projectId) =>
  deploymentRepository.stopDeployments(projectId);

const updateStatus = async (deploymentId, status) =>
  deploymentRepository.updateDeploymentStatus(deploymentId, status);

const updateImage = async (deploymentId, image) =>
  deploymentRepository.updateDeploymentImage(deploymentId, image);

const markStoppedByUser = async (projectId, stopped) =>
  deploymentRepository.markStoppedByUser(projectId, stopped);

const getLatestDeployment = async (projectId) =>
  deploymentRepository.getLatestDeployment(projectId);

const getProjectDeployments = async (projectId) =>
  deploymentRepository.getProjectDeployments(projectId);

const fail = async (deploymentId) =>
  deploymentRepository.updateDeploymentStatus(deploymentId, "failed");

const running = async (deploymentId) =>
  deploymentRepository.updateDeploymentStatus(deploymentId, "running");

const updateContainer = async (
  deploymentId,
  containerId,
  containerName,
  containerPort,
) =>
  deploymentRepository.updateDeploymentContainer(
    deploymentId,
    containerId,
    containerName,
    containerPort,
  );

module.exports = {
  create,
  stopPreviousDeployments,
  updateStatus,
  updateImage,
  markStoppedByUser,
  getLatestDeployment,
  getProjectDeployments,
  fail,
  running,
  updateContainer,
};
