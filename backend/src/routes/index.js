const express = require("express");
const router = express.Router();
const projectRoutes = require("./project.routes");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const fileRoutes = require("./file.routes");
const environmentRoutes = require("./environment.routes");
const applicationRoutes = require("./application.routes");
const deploymentRoutes = require("./deployment.routes");

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/", fileRoutes);
router.use(environmentRoutes);
router.use(applicationRoutes);
router.use("/", deploymentRoutes);

module.exports = router;
