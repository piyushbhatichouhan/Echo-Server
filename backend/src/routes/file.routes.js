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
module.exports = router;
