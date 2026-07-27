const express = require("express");

const authenticate = require("../middleware/auth.middleware");

const { dashboard } = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/", authenticate, dashboard);

module.exports = router;
