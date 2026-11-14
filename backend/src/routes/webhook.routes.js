const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhook.controller");

// Global webhook endpoint
router.post(
  "/github",
  webhookController.githubWebhook,
);

// Project-specific webhook endpoint
router.post(
  "/github/:projectId",
  webhookController.githubWebhook,
);

module.exports = router;
