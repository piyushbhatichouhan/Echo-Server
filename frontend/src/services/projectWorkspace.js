import * as projectApi from "./projectFiles.api";
import { getCloudStats } from "./cloud.api";

export default {
  getFiles: (projectId) => projectApi.getProjectFiles(projectId),
  uploadFile: projectApi.uploadProjectFile,
  createFolder: (projectId, currentFolder, name) => {
    const path = currentFolder ? `${currentFolder}/${name}` : name;
    return projectApi.createProjectFolder(projectId, path);
  },

  createFile: (projectId, currentFolder, name) => {
    const path = currentFolder ? `${currentFolder}/${name}` : name;
    return projectApi.createProjectFile(projectId, path);
  },

  getFileContent: projectApi.getProjectFileContent,
  saveFileContent: projectApi.saveProjectFileContent,

  renamePath: (projectId, item, newName) => {
    return projectApi.renameProjectPath(
      projectId,
      item.path,
      newName,
      item.type,
    );
  },
  deletePath: (projectId, item) =>
    projectApi.deleteProjectPath(projectId, item.path, item.type),

  downloadFile: projectApi.downloadProjectFile,
  getFileBlob: projectApi.getProjectFileBlob,

  getStats: getCloudStats,

  copyPath: projectApi.copyPath,
  cutPath: projectApi.cutPath,
  pastePath: projectApi.pastePath,
};
