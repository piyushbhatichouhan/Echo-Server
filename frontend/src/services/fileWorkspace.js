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

export const createFileWorkspace = (adapter) => ({
  getFiles: adapter.getFiles,
  uploadFile: adapter.uploadFile,
  createFolder: adapter.createFolder,
  createFile: adapter.createFile,
  getFileContent: adapter.getFileContent,
  saveFileContent: adapter.saveFileContent,
  downloadFile: adapter.downloadFile,
  deleteFile: adapter.deleteFile,
  renameFile: adapter.renameFile,
  getStats: adapter.getStats,
  deleteFolder: adapter.deleteFolder,
  getFileBlob: adapter.getFileBlob,
});
