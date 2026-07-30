const deploymentLogService = require("../../deployment-log.service");

const info = async (deploymentId, message) =>
  deploymentLogService.addLog(deploymentId, message);

const warn = async (deploymentId, message) =>
  deploymentLogService.addLog(deploymentId, `[WARN] ${message}`);

const error = async (deploymentId, message) =>
  deploymentLogService.addLog(deploymentId, `[ERROR] ${message}`);

const stage = async (deploymentId, stageName) =>
  deploymentLogService.addLog(
    deploymentId,
    `========== ${stageName} ==========`,
  );

module.exports = {
  info,
  warn,
  error,
  stage,
};
