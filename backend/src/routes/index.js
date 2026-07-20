const express = require("express");
const router = express.Router();
const projectRoutes = require("./project.routes");
const webhookRoutes = require("./webhook.routes");
const authRoutes = require("./auth.routes");
const fileRoutes = require("./file.routes");
const environmentRoutes = require("./environment.routes");
const applicationRoutes = require("./application.routes");
const deploymentRoutes = require("./deployment.routes");
const gitRoutes = require("./git.routes");
const projectSettingsRoutes = require("./projectSettings.routes");

router.use("/webhooks", webhookRoutes);

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/", fileRoutes);
router.use(environmentRoutes);
router.use(applicationRoutes);
router.use("/", deploymentRoutes);
router.use(gitRoutes);
router.use(projectSettingsRoutes);
module.exports = router;
