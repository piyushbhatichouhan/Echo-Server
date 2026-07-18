const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const { uploadFile } = require("../controllers/file.controller");
const {
  listFiles,
  downloadFile,
  removeFile,

  saveFileContent,
  createProjectFolder,
} = require("../controllers/file.controller");

const { getFileContent } = require("../controllers/file.controller");

router.get("/projects/:id/files", authenticate, listFiles);
router.post("/projects/:id/folders", authenticate, createProjectFolder);
router.post(
  "/projects/:id/files",
  authenticate,

  (req, res, next) => {
    console.log("BEFORE");
    console.log(req.headers["content-type"]);
    next();
  },

  upload.single("file"),

  (req, res, next) => {
    console.log("AFTER");
    console.log(req.file);
    next();
  },

  uploadFile,
);
router.delete("/files/:id", authenticate, removeFile);
router.get("/files/:id/content", authenticate, getFileContent);

router.put("/files/:id/content", authenticate, saveFileContent);

router.get("/files/:id/download", authenticate, downloadFile);

module.exports = router;
