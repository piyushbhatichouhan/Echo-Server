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
  deletePath: (projectId, item, permanent) =>
    projectApi.deleteProjectPath(projectId, item.path, item.type, permanent),

  deletePaths: (projectId, items, permanent) =>
    projectApi.deleteProjectPaths(projectId, items, permanent),

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

  getTrash: (projectId) => projectApi.getProjectTrash(projectId),
  restoreTrash: (projectId, fileId) => projectApi.restoreProjectTrash(projectId, fileId),
  emptyTrash: (projectId) => projectApi.emptyProjectTrash(projectId),
  compressPaths: (projectId, items, zipName, destination) =>
    projectApi.compressProjectPaths(projectId, items, zipName, destination),
  searchFiles: (projectId, query) => projectApi.searchProjectFiles(projectId, query),
  exportToCloud: (projectId, items, destination) =>
    projectApi.exportProjectToCloud(projectId, items, destination),
  importToProject: (projectId, items, destination) =>
    projectApi.importCloudToProject(projectId, items, destination),
  isCloud: false,
});
