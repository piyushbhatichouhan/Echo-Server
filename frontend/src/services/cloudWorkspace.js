import { createFileWorkspace } from "./fileWorkspace";

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

export default createFileWorkspace({
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
  deleteFolder: deleteCloudFolder,

  getStats: getCloudStats,

  getFileBlob,
});
