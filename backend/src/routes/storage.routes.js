const express = require("express");

const router = express.Router();

const authenticateToken = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");

const storageController = require("../controllers/storage.controller");

router.use(authenticateToken);
router.use(requireOwner);

router.get("/overview", storageController.getOverview);
router.get("/users", storageController.getUsersStorage);
router.get("/projects", storageController.getProjectsStorage);
router.patch("/users/:id/quota", storageController.updateUserQuota);

module.exports = router;
