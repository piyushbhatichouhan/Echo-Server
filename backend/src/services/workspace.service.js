const path = require("path");
const fs = require("fs/promises");
const { getCloudRoot } = require("../storage/cloud.storage.manager");

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

const getProjectPath = (projectId) => {
  return path.join(STORAGE_ROOT, "projects", projectId.toString());
};

const getCloudPath = (userId) => {
  return getCloudRoot(userId);
};

const getFilesPath = (projectId) => {
  return path.join(getProjectPath(projectId), "files");
};

const getCloudFilesPath = (userId) => {
  return path.join(getCloudPath(userId), "files");
};

const getBuildPath = (projectId) => {
  return path.join(getProjectPath(projectId), "build");
};

const getRuntimePath = (projectId) => {
  return path.join(getProjectPath(projectId), "runtime");
};

const getLogsPath = (projectId) => {
  return path.join(getProjectPath(projectId), "logs");
};

const ensureWorkspace = async (projectId) => {
  const projectPath = getProjectPath(projectId);
  const filesPath = getFilesPath(projectId);
  const buildPath = getBuildPath(projectId);
  const runtimePath = getRuntimePath(projectId);
  const logsPath = getLogsPath(projectId);

  const directories = [
    projectPath,
    filesPath,
    buildPath,
    runtimePath,
    logsPath,
  ];

  for (const directory of directories) {
    await fs.mkdir(directory, {
      recursive: true,
    });
  }

  return {
    projectPath,
    filesPath,
    buildPath,
    runtimePath,
    logsPath,
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
