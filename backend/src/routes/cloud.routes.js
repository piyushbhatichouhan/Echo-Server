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
router.get("/stats", authenticate, cloudController.getStats);
router.delete("/folder", authenticate, cloudController.deleteFolder);
module.exports = router;
