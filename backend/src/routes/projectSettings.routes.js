const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
  getProjectSettings,
  updateProjectSettings,
} = require("../controllers/projectSettings.controller");

router.get("/projects/:id/settings", authenticate, getProjectSettings);

router.put("/projects/:id/settings", authenticate, updateProjectSettings);

module.exports = router;
