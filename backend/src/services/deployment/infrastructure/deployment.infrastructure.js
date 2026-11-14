const deploymentRepository = require("../../../repositories/deployment.repository");
const portService = require("../../port.service");
const gitOperations = require("../../../git/git.service");
const { getGitRoot } = require("../../../storage/git.storage.manager");

const create = async (projectId, image, container, gitMeta = null) => {
  const hostPort = await portService.getAvailablePort(projectId);

  let meta = gitMeta ? { ...gitMeta } : {};
  if (!meta.commitHash) {
    try {
      const gitDir = getGitRoot(projectId);
      const commits = await gitOperations.log(gitDir, 1);
      const branches = await gitOperations.branches(gitDir);
      if (commits && commits.length > 0) {
        meta.commitHash = commits[0].hash;
        meta.commitMessage = commits[0].message;
        meta.commitAuthor = commits[0].author_name;
      }
      if (branches?.current) {
        meta.gitBranch = branches.current;
      }
    } catch (e) {
      // not a git project or empty
    }
  }

  return deploymentRepository.createDeployment(
    projectId,
    image,
    container,
    hostPort,
    meta,
  );
}; 

const stopPreviousDeployments = async (projectId, exceptDeploymentId = null) =>
  deploymentRepository.stopDeployments(projectId, exceptDeploymentId);

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

const updatePort = async (deploymentId, port) =>
  deploymentRepository.updateDeploymentPort(deploymentId, port);

module.exports = {
  create,
  stopPreviousDeployments,
  updateStatus,
  updateImage,
  markStoppedByUser,
  getLatestDeployment,
  getLatest: getLatestDeployment,
  getProjectDeployments,
  fail,
  running,
  updateContainer,
  updatePort,
  getDeploymentById: deploymentRepository.getDeploymentById,
};

