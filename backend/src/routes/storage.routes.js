const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");

const storageController = require("../controllers/storage.controller");
const storageService = require("../services/storage.service");

router.use(authenticateToken);

// User storage stats endpoint accessible to all authenticated users
router.get("/my-stats", async (req, res, next) => {
  try {
    const stats = await storageService.getUserStorageStats(req.user.id);
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

router.use(requireOwner);

router.get("/overview", storageController.getOverview);
router.get("/users", storageController.getUsersStorage);
router.get("/projects", storageController.getProjectsStorage);
router.patch("/users/:id/quota", storageController.updateUserQuota);

module.exports = router;
