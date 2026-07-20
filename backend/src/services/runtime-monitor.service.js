const deploymentRepository = require("../repositories/deployment.repository");
const containerService = require("./container.service");

const CHECK_INTERVAL = 5000;

let timer = null;

const start = () => {
  if (timer) return;

  timer = setInterval(async () => {
    try {
      const deployments = await deploymentRepository.getRunningDeployments();

      for (const deployment of deployments) {
        const status = await containerService.getContainerStatus(
          deployment.project_id,
        );

        if (!status.running) {
          if (deployment.stopped_by_user) {
            await deploymentRepository.updateDeploymentStatus(
              deployment.id,
              "stopped",
            );
          } else {
            await deploymentRepository.updateDeploymentStatus(
              deployment.id,
              "crashed",
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, CHECK_INTERVAL);
};

module.exports = {
  start,
};
