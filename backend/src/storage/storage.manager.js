const path = require("path");

const {
  PROJECTS_ROOT,
  TEMP_ROOT,
  LOGS_ROOT,
  BACKUPS_ROOT,
} = require("../config/app.config");

const getProjectRoot = (projectId) => {
  return path.join(PROJECTS_ROOT, projectId);
};

const getProjectFilesDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "files");
};

const getProjectSourceDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "source");
};

const getProjectBuildDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "builds");
};

const getProjectRuntimeDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "runtime");
};

const getProjectLogsDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "logs");
};

const getProjectBackupsDirectory = (projectId) => {
  return path.join(getProjectRoot(projectId), "backups");
};

module.exports = {
  TEMP_ROOT,
  LOGS_ROOT,
  BACKUPS_ROOT,

  getProjectRoot,
  getProjectFilesDirectory,
  getProjectSourceDirectory,
  getProjectBuildDirectory,
  getProjectRuntimeDirectory,
  getProjectLogsDirectory,
  getProjectBackupsDirectory,
};
