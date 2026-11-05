const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const controller = require("./domain.controller");

const router = express.Router();

router.use(authenticate);

router.post("/assign", controller.assign);
router.get("/:projectId", controller.getDomains);

module.exports = router;

