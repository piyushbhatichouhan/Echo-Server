const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");
const { dockerInfo } = require("../controllers/system.controller");

router.get("/system/docker", authenticate, requireOwner, dockerInfo);

module.exports = router;
