const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const cloudController = require("../controllers/cloud.controller");

router.post(
  "/files",
  authenticate,
  upload.single("file"),
  cloudController.upload,
);
router.get("/files", authenticate, cloudController.list);

router.post("/folders", authenticate, cloudController.createFolder);
router.post("/files/create", authenticate, cloudController.createFile);
router.get("/files/:id/content", authenticate, cloudController.getFileContent);
router.put("/files/:id/content", authenticate, cloudController.saveFileContent);
router.get("/files/:id/download", authenticate, cloudController.download);
router.delete("/files/:id", authenticate, cloudController.deleteFile);
router.put("/files/:id/rename", authenticate, cloudController.renameFile);
router.put("/rename", authenticate, cloudController.renamePath);
router.get("/stats", authenticate, cloudController.getStats);
router.delete("/folder", authenticate, cloudController.deleteFolder);
router.post("/copy", authenticate, cloudController.copyCloudPath);

router.post("/cut", authenticate, cloudController.cutCloudPath);

router.post("/paste", authenticate, cloudController.pasteCloudPath);

router.delete("/paths/bulk", authenticate, cloudController.deletePaths);
router.post("/delete/paths", authenticate, cloudController.deletePaths);
router.post(
  "/paths/bulk/download",
  authenticate,
  cloudController.downloadPaths,
);
router.post("/download/paths", authenticate, cloudController.downloadPaths);

router.get("/trash", authenticate, cloudController.getTrash);
router.post("/trash/restore", authenticate, cloudController.restoreFromTrash);
router.delete("/trash/empty", authenticate, cloudController.emptyTrash);
router.post("/extract", authenticate, cloudController.extractArchive);

module.exports = router;
