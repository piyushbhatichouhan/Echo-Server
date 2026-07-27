const express = require("express");

const authenticate = require("../middleware/auth.middleware");
const requireOwner = require("../middleware/requireOwner");

const controller = require("../controllers/server.controller");

const router = express.Router();

router.use(authenticate);
router.use(requireOwner);

router.get("/pending-users", controller.getPendingUsers);

router.post("/users/:id/approve", controller.approveUser);

router.post("/users/:id/reject", controller.rejectUser);

module.exports = router;
