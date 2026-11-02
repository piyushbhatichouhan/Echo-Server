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
  compressCloudPaths,
  searchCloudFiles,
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
  deletePath: async (_, item, permanent = false) => {
    if (item.type === "folder") {
      return deleteCloudFolder(item.path);
    }

    if (item.file?.id) {
      return deleteCloudFile(item.file.id);
    }

    return deleteCloudPaths([{ relativePath: item.path, type: item.type }], permanent);
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

  deletePaths: async (_, items, permanent = false) => deleteCloudPaths(items, permanent),

  extractArchive: async (_, relativePath, destination) =>
    extractCloudArchive(relativePath, destination),

  getTrash: async () => getCloudTrash(),
  restoreTrash: async (workspaceIdOrFileId, maybeFileId) => {
    const fileId = maybeFileId !== undefined ? maybeFileId : workspaceIdOrFileId;
    return restoreCloudTrash(fileId);
  },
  emptyTrash: async () => emptyCloudTrash(),

  compressPaths: async (_, items, zipName, destination) =>
    compressCloudPaths(items, zipName, destination),
  searchFiles: async (_, query) => searchCloudFiles(query),
  isCloud: true,
});
