import { createFileWorkspace } from "./createFileWorkspace";
import * as projectApi from "./projectFiles.api";

export default createFileWorkspace({
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

  deletePaths: (projectId, items) =>
    projectApi.deleteProjectPaths(projectId, items),

  downloadFile: projectApi.downloadProjectFile,
  downloadPaths: (projectId, items) =>
    projectApi.downloadProjectPaths(projectId, items),

  getFileBlob: projectApi.getProjectFileBlob,

  getStats: (projectId) => projectApi.getProjectStats(projectId),

  copyPath: projectApi.copyPath,
  cutPath: projectApi.cutPath,
  pastePath: projectApi.pastePath,

  extractArchive: (projectId, relativePath, destination) =>
    projectApi.extractProjectArchive(projectId, relativePath, destination),
});
