const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");
const {
  dockerInfo,
  getOutboundIp,
  getDeploymentGuide,
} = require("../controllers/system.controller");

router.get("/system/docker", authenticate, requireOwner, dockerInfo);
router.get("/system/outbound-ip", authenticate, getOutboundIp);
router.get("/system/guide", authenticate, getDeploymentGuide);

module.exports = router;
