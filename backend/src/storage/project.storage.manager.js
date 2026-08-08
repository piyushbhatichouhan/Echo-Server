const path = require("path");
const fs = require("fs/promises");

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");

const PROJECT_ROOT = path.join(STORAGE_ROOT, "projects");

const getProjectRoot = (projectId) => {
  return path.join(PROJECT_ROOT, projectId.toString());
};

const getProjectFilesRoot = (projectId) => {
  return path.join(getProjectRoot(projectId), "files");
};

const getProjectBuildRoot = (projectId) => {
  return path.join(getProjectRoot(projectId), "build");
};

const getProjectRuntimeRoot = (projectId) => {
  return path.join(getProjectRoot(projectId), "runtime");
};

const getProjectLogsRoot = (projectId) => {
  return path.join(getProjectRoot(projectId), "logs");
};

const resolveProjectStoragePath = (projectId, relativePath) => {
  return path.join(getProjectFilesRoot(projectId), relativePath);
};

const ensureProjectWorkspace = async (projectId) => {
  const projectRoot = getProjectRoot(projectId);
  const filesRoot = getProjectFilesRoot(projectId);
  const buildRoot = getProjectBuildRoot(projectId);
  const runtimeRoot = getProjectRuntimeRoot(projectId);
  const logsRoot = getProjectLogsRoot(projectId);

  const directories = [
    projectRoot,
    filesRoot,
    buildRoot,
    runtimeRoot,
    logsRoot,
  ];

  for (const directory of directories) {
    await fs.mkdir(directory, {
      recursive: true,
    });
  }

  return {
    projectRoot,
    filesRoot,
    buildRoot,
    runtimeRoot,
    logsRoot,
  };
};

module.exports = {
  STORAGE_ROOT,
  PROJECT_ROOT,

  getProjectRoot,
  getProjectFilesRoot,
  getProjectBuildRoot,
  getProjectRuntimeRoot,
  getProjectLogsRoot,

  resolveProjectStoragePath,
  ensureProjectWorkspace,
};
