const express = require("express");

const authenticate = require("../middleware/auth.middleware");

const controller = require("./publication.controller");

const router = express.Router();

router.get("/check-subdomain", authenticate, controller.checkSubdomain);

router.get("/:projectId/publish", authenticate, controller.getPublication);

router.post("/:projectId/publish", authenticate, controller.publishProject);

router.patch("/:projectId/subdomain", authenticate, controller.updateSubdomain);

router.delete("/:projectId/publish", authenticate, controller.unpublishProject);

module.exports = router;
