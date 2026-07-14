const deploymentLogRepository = require("../repositories/deployment-log.repository");
const logStreamService = require("./log-stream.service");
const deploymentRepository = require("../repositories/deployment.repository");

const addLog = async (deploymentId, message) => {
  const log = await deploymentLogRepository.addLog(
    deploymentId,
    String(message),
  );

  const deployment = await deploymentRepository.getDeploymentById(deploymentId);

  logStreamService.broadcast(deployment.project_id, String(message));

  return log;
};

const getLogs = async (projectId) => {
  return await deploymentLogRepository.getLogs(projectId);
};

module.exports = {
  addLog,
  getLogs,
};
