const deploymentRepository = require("../../../repositories/deployment.repository");

const create = async (projectId, image, container, port) =>
  deploymentRepository.createDeployment(projectId, image, container, port);

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
};
