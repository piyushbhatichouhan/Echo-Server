export const createFileWorkspace = (adapter) => ({
  getFiles: adapter.getFiles,
  uploadFile: adapter.uploadFile,
  createFolder: adapter.createFolder,
  createFile: adapter.createFile,

  getFileContent: adapter.getFileContent,
  saveFileContent: adapter.saveFileContent,

  downloadFile: adapter.downloadFile,
  downloadPaths: adapter.downloadPaths,
  getFileBlob: adapter.getFileBlob,

  renamePath: adapter.renamePath,
  deletePath: adapter.deletePath,
  deletePaths: adapter.deletePaths,
  getStats: adapter.getStats,

  copyPath: adapter.copyPath,
  cutPath: adapter.cutPath,
  pastePath: adapter.pastePath,
  extractArchive: adapter.extractArchive,

  compressPaths: adapter.compressPaths,
  searchFiles: adapter.searchFiles,
  getTrash: adapter.getTrash,
  restoreTrash: adapter.restoreTrash,
  emptyTrash: adapter.emptyTrash,
  exportToCloud: adapter.exportToCloud,
  importToProject: adapter.importToProject,
  isCloud: adapter.isCloud || false,
});
