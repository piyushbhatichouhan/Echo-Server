// services/projectWorkspace.js

import * as projectApi from "./projectFiles.api";
import { getCloudStats } from "./cloud.api";

export default {
  getFiles: projectApi.getProjectFiles,
  uploadFile: projectApi.uploadProjectFile,
  createFolder: projectApi.createProjectFolder,
  createFile: projectApi.createProjectFile,

  getFileContent: projectApi.getProjectFileContent,
  saveFileContent: projectApi.saveProjectFileContent,

  renameFile: projectApi.renameProjectFile,
  deleteFile: projectApi.deleteProjectFile,

  downloadFile: projectApi.downloadProjectFile,
  getFileBlob: projectApi.getProjectFileBlob,
  deleteFolder: projectApi.deleteProjectFolder,
  getStats: getCloudStats,
};
