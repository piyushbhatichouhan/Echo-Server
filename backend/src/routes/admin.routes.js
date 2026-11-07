const router = require("express").Router();

const authenticate = require("../middleware/auth.middleware");
const requireAdmin = require("../middleware/requireOwner");

const controller = require("../controllers/admin.controller");

const serverSettingsController = require("../controllers/serverSettings.controller");
const mailerController = require("../controllers/mailer.controller");

router.use(authenticate);
router.use(requireAdmin);

// Mailer & Broadcast Routes
router.get("/mailer/templates", mailerController.getTemplates);
router.get("/mailer/recipients", mailerController.getRecipients);
router.post("/mailer/preview", mailerController.previewEmail);
router.post("/mailer/test", mailerController.sendTestEmail);
router.post("/mailer/send", mailerController.sendBroadcast);
router.get("/mailer/history", mailerController.getHistory);

router.get("/users", controller.getUsers);

router.patch("/users/:id/disable", controller.disableUser);

router.patch("/users/:id/enable", controller.enableUser);

router.delete("/users/:id", controller.deleteUser);
router.post(
  "/users/:id/restore",

  controller.restoreUser,
);

router.get("/storage", serverSettingsController.getStorageOverview);
router.put(
  "/users/:id/quota",

  controller.updateUserQuota,
);

router.patch(
  "/users/:id/subdomain-access",
  controller.toggleCustomSubdomainAccess,
);

router.get("/subdomain-requests", controller.getSubdomainRequests);
router.get("/subdomain-requests/stats", controller.getSubdomainRequestStats);
router.post("/subdomain-requests/:id/approve", controller.approveSubdomainRequest);
router.post("/subdomain-requests/:id/reject", controller.rejectSubdomainRequest);
router.post("/subdomain-requests/:id/revoke", controller.revokeCustomSubdomain);
router.post("/projects/:id/revoke-subdomain", controller.revokeCustomSubdomain);
router.delete("/subdomain-requests/:id", controller.deleteSubdomainRequest);

router.post("/notifications/test", controller.testNotification);

module.exports = router;
