const path = require("path");
const fs = require("fs/promises");

const {
  STORAGE_ROOT,
  getProjectRoot,
  getProjectFilesRoot,
  getProjectBuildRoot,
  getProjectRuntimeRoot,
  getProjectLogsRoot,
  ensureProjectWorkspace,
} = require("../storage/project.storage.manager");

const { getCloudRoot } = require("../storage/cloud.storage.manager");

const getCloudPath = (userId) => {
  return getCloudRoot(userId);
};

const getCloudFilesPath = (userId) => {
  return path.join(getCloudPath(userId), "files");
};

const getProjectPath = (projectId) => {
  return getProjectRoot(projectId);
};

const getFilesPath = (projectId) => {
  return getProjectFilesRoot(projectId);
};

const getBuildPath = (projectId) => {
  return getProjectBuildRoot(projectId);
};

const getRuntimePath = (projectId) => {
  return getProjectRuntimeRoot(projectId);
};

const getLogsPath = (projectId) => {
  return getProjectLogsRoot(projectId);
};

const ensureWorkspace = async (projectId) => {
  const { projectRoot, filesRoot, buildRoot, runtimeRoot, logsRoot } =
    await ensureProjectWorkspace(projectId);

  return {
    projectPath: projectRoot,
    filesPath: filesRoot,
    buildPath: buildRoot,
    runtimePath: runtimeRoot,
    logsPath: logsRoot,
  };
};

const ensureCloudWorkspace = async (userId) => {
  const cloudPath = getCloudPath(userId);
  const filesPath = getCloudFilesPath(userId);

  await fs.mkdir(filesPath, {
    recursive: true,
  });

  return {
    cloudPath,
    filesPath,
  };
};

const getStorageRoot = () => STORAGE_ROOT;

module.exports = {
  getProjectPath,
  getFilesPath,
  getBuildPath,
  getRuntimePath,
  getLogsPath,
  ensureWorkspace,
  getStorageRoot,

  getCloudPath,
  getCloudFilesPath,
  ensureCloudWorkspace,
};
