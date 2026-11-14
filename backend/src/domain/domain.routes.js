const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const controller = require("./domain.controller");

const router = express.Router();

router.use(authenticate);

router.post("/assign", controller.assign);
router.get("/:projectId", controller.getDomains);
router.post("/:projectId/custom", controller.addCustomDomain);
router.delete("/:projectId/custom/:domainId", controller.deleteCustomDomain);
router.post("/:projectId/custom/:domainId/verify", controller.verifyCustomDomain);

module.exports = router;

