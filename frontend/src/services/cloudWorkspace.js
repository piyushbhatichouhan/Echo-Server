import { createFileWorkspace } from "./createFileWorkspace";

import {
  getCloudFiles,
  uploadCloudFile,
  createCloudFolder,
  createCloudFile,
  getCloudFileContent,
  saveCloudFileContent,
  downloadCloudFile,
  deleteCloudFile,
  renameCloudFile,
  renameCloudPath,
  getCloudStats,
  deleteCloudFolder,
  getFileBlob,
  deleteCloudPaths,
  downloadCloudPaths,
  extractCloudArchive,
  getCloudTrash,
  restoreCloudTrash,
  emptyCloudTrash,
} from "./cloud.api";
import { copyCloudPath, cutCloudPath, pasteCloudPath } from "./cloud.api";

export default createFileWorkspace({
  getFiles: () => getCloudFiles(),

  uploadFile: (folder, file, relativePath, onUploadProgress, signal) =>
    uploadCloudFile(folder, file, relativePath, onUploadProgress, signal),

  createFolder: (_workspaceId, currentFolder, name) => {
    const path = currentFolder ? `${currentFolder}/${name}` : name;
    return createCloudFolder(path);
  },

  createFile: (_workspaceId, currentFolder, name) => {
    const path = currentFolder ? `${currentFolder}/${name}` : name;
    return createCloudFile(path);
  },

  getFileContent: getCloudFileContent,
  saveFileContent: saveCloudFileContent,

  downloadFile: downloadCloudFile,
  downloadPaths: async (_, items) => downloadCloudPaths(items),
  deletePath: async (_, item) => {
    if (item.type === "folder") {
      return deleteCloudFolder(item.path);
    }

    if (item.file?.id) {
      return deleteCloudFile(item.file.id);
    }

    return deleteCloudPaths([{ relativePath: item.path, type: item.type }]);
  },

  renamePath: async (_, item, newName) => {
    return renameCloudPath(item, newName);
  },

  getStats: getCloudStats,

  getFileBlob,
  copyPath: async (_, relativePath, type) =>
    copyCloudPath({
      relativePath,
      type,
    }),

  cutPath: async (_, relativePath, type) =>
    cutCloudPath({
      relativePath,
      type,
    }),

  pastePath: async (_, clipboard, destination) =>
    pasteCloudPath(clipboard, destination),

  deletePaths: async (_, items) => deleteCloudPaths(items),

  extractArchive: async (_, relativePath, destination) =>
    extractCloudArchive(relativePath, destination),

  getTrash: getCloudTrash,
  restoreTrash: restoreCloudTrash,
  emptyTrash: emptyCloudTrash,
});
