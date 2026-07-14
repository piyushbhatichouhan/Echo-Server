const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const { uploadFile } = require("../controllers/file.controller");
const {
  listFiles,
  downloadFile,
  removeFile,
} = require("../controllers/file.controller");

router.get("/projects/:id/files", authenticate, listFiles);

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
router.get("/files/:id/download", authenticate, downloadFile);

router.delete("/files/:id", authenticate, removeFile);

module.exports = router;
