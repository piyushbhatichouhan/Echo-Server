const express = require("express");

const authenticate = require("../middleware/auth.middleware");

const controller = require("./publication.controller");

const router = express.Router();

router.get("/:projectId/publish", authenticate, controller.getPublication);

router.post("/:projectId/publish", authenticate, controller.publishProject);

router.delete("/:projectId/publish", authenticate, controller.unpublishProject);

module.exports = router;
