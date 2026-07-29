const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const controller = require("../controllers/runtime.controller");

router.get("/runtimes", controller.getAvailableRuntimes);

module.exports = router;
