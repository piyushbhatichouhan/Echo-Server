const deploymentLogRepository = require("../repositories/deployment-log.repository");
const logStreamService = require("./log-stream.service");
const deploymentRepository = require("../repositories/deployment.repository");
const logClassifier = require("./logClassifier.service");

const addLog = async (
  deploymentId,
  rawMessage,
  explicitLevel = null,
  explicitCategory = null,
) => {
  const classified = logClassifier.classify(
    rawMessage,
    explicitLevel,
    explicitCategory,
  );

  // Skip low-value internal noise
  if (classified.isNoise) {
    return null;
  }

  const log = await deploymentLogRepository.addLog(
    deploymentId,
    classified.message,
    classified.level,
    classified.category,
  );

  try {
    const deployment = await deploymentRepository.getDeploymentById(deploymentId);
    if (deployment?.project_id) {
      logStreamService.broadcast(deployment.project_id, {
        id: log.id,
        timestamp: log.timestamp || new Date().toISOString(),
        message: classified.message,
        level: classified.level,
        category: classified.category,
      });
    }
  } catch (err) {
    console.warn("[DeploymentLogService] Broadcast warning:", err.message);
  }

  return log;
};

const getLogs = async (projectId, options = {}) => {
  const rows = await deploymentLogRepository.getLogs(projectId, options);

  const formatted = [];
  for (const row of rows) {
    const classified = logClassifier.classify(
      row.message,
      row.level,
      row.category,
    );

    if (!classified.isNoise) {
      formatted.push({
        id: row.id,
        timestamp: row.timestamp,
        message: classified.message,
        level: classified.level,
        category: classified.category,
      });
    }
  }

  return formatted;
};

module.exports = {
  addLog,
  getLogs,
};
