const express = require("express");

const controller = require("./domain.controller");

const router = express.Router();

router.post("/assign", controller.assign);

router.get("/:projectId", controller.getDomains);

module.exports = router;
