const path = require("path");
const storage = require("../../config/storage");

const getProjectWorkspace = (projectId) => {
  return path.join(storage.projects, projectId.toString());
};

const getProjectFilesDirectory = (projectId) => {
  return path.join(getProjectWorkspace(projectId), "files");
};

module.exports = {
  getProjectWorkspace,
  getProjectFilesDirectory,
};
