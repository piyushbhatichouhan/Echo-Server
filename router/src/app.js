const express = require("express");
const routerService = require("./router.service");
const proxyService = require("./proxy.service");

const app = express();

app.use(express.json());

app.use(async (req, res) => {
  try {
    console.log("Host Header:", req.headers.host);
    const host = req.headers.host.split(":")[0];

    const project = await routerService.resolveHostname(host);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Unknown hostname",
      });
    }

    // Never deployed
    if (!project.deployment.containerName) {
      return res.status(503).json({
        success: false,
        message: "Project has never been deployed",
      });
    }

    // Deployment exists but isn't running
    if (project.deployment.status !== "running") {
      return res.status(503).json({
        success: false,
        message: "Project is not running",
      });
    }

    proxyService.proxyRequest(req, res, project.deployment);
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal router error",
    });
  }
});

module.exports = app;
