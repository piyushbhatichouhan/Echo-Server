import * as api from "./file.api";

export default {
  getFiles: api.getFiles,
  uploadFile: api.uploadFile,
  deleteFile: api.deleteFile,
  renameFile: api.renameFile,
  createFolder: api.createFolder,
  createFile: api.createFile,
  downloadFile: api.downloadFile,
  getFileContent: api.getFileContent,
  saveFileContent: api.saveFileContent,
};
