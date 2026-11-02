const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const {
  uploadFile,
  renameProjectFile,
} = require("../controllers/file.controller");
const {
  listFiles,
  downloadFile,
  removeFile,

  saveFileContent,
  createProjectFolder,
  createProjectFile,
} = require("../controllers/file.controller");

const {
  getFileContent,
  deleteProjectPath,
  renameProjectPath,
  copyPath,
  cutPath,
  pastePath,
  deletePaths,
  downloadPaths,
  getStats,
  extractArchive,
  getTrash,
  restoreFromTrash,
  emptyTrash,
  compressProjectPaths,
  searchProjectFiles,
  exportProjectToCloud,
  importCloudToProject,
} = require("../controllers/file.controller");

router.get("/projects/:id/files", authenticate, listFiles);
router.post("/projects/:id/folders", authenticate, createProjectFolder);
router.post("/projects/:id/files/create", authenticate, createProjectFile);
router.post(
  "/projects/:id/files",
  authenticate,

  (req, res, next) => {
    next();
  },

  upload.single("file"),

  (req, res, next) => {
    next();
  },

  uploadFile,
);
router.delete("/files/:id", authenticate, removeFile);
router.get("/files/:id/content", authenticate, getFileContent);

router.put("/files/:id/content", authenticate, saveFileContent);

router.get("/files/:id/download", authenticate, downloadFile);

router.put("/files/:id/rename", authenticate, renameProjectFile);
router.delete("/projects/:id/path", authenticate, deleteProjectPath);
router.put("/projects/:id/rename", authenticate, renameProjectPath);

router.get("/projects/:id/stats", authenticate, getStats);
router.delete("/projects/:id/paths/bulk", authenticate, deletePaths);
router.post("/projects/:id/paths/bulk/download", authenticate, downloadPaths);
router.post("/projects/:id/files/extract", authenticate, extractArchive);

router.get("/projects/:id/trash", authenticate, getTrash);
router.post("/projects/:id/trash/restore", authenticate, restoreFromTrash);
router.delete("/projects/:id/trash/empty", authenticate, emptyTrash);

router.post("/projects/:id/files/compress", authenticate, compressProjectPaths);
router.get("/projects/:id/files/search", authenticate, searchProjectFiles);
router.post("/projects/:id/files/export-to-cloud", authenticate, exportProjectToCloud);
router.post("/projects/:id/files/import-from-cloud", authenticate, importCloudToProject);

router.post("/files/copy", authenticate, copyPath);
router.post("/files/cut", authenticate, cutPath);
router.post("/files/paste", authenticate, pastePath);

module.exports = router;
