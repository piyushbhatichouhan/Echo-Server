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
  getCloudStats,
  deleteCloudFolder,
  getFileBlob,
} from "./cloud.api";
import { copyCloudPath, cutCloudPath, pasteCloudPath } from "./cloud.api";

export default createFileWorkspace({
  getFiles: () => getCloudFiles(),

  uploadFile: (folder, file, relativePath, onUploadProgress) =>
    uploadCloudFile(folder, file, relativePath, onUploadProgress),

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

  deletePath: async (_, item) => {
    if (item.type === "folder") {
      return deleteCloudFolder(item.path);
    }

    return deleteCloudFile(item.file.id);
  },

  renamePath: async (_, item, newName) => {
    return renameCloudFile(item.file.id, newName);
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
});
