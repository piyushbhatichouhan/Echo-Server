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
} from "./cloud.api";

export default {
  getFiles: getCloudFiles,
  uploadFile: (folder, file, relativePath) =>
    uploadCloudFile(folder, file, relativePath),
  createFolder: createCloudFolder,
  createFile: createCloudFile,
  getFileContent: getCloudFileContent,
  saveFileContent: saveCloudFileContent,
  downloadFile: downloadCloudFile,
  deleteFile: deleteCloudFile,
  renameFile: renameCloudFile,
  getStats: getCloudStats,
  deleteFolder: deleteCloudFolder,
};
