const deploymentLogService = require("../../deployment-log.service");

const info = async (deploymentId, message, category = "system") =>
  deploymentLogService.addLog(deploymentId, message, "info", category);

const warn = async (deploymentId, message, category = "system") =>
  deploymentLogService.addLog(deploymentId, message, "warn", category);

const error = async (deploymentId, message, category = "system") =>
  deploymentLogService.addLog(deploymentId, message, "error", category);

const stage = async (deploymentId, stageName) =>
  deploymentLogService.addLog(
    deploymentId,
    `========== ${stageName} ==========`,
    "step",
    "system",
  );

const build = async (deploymentId, message) =>
  deploymentLogService.addLog(deploymentId, message, null, "build");

const runtime = async (deploymentId, message) =>
  deploymentLogService.addLog(deploymentId, message, null, "runtime");

module.exports = {
  info,
  warn,
  error,
  stage,
  build,
  runtime,
};
