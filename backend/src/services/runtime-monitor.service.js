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
            try {
              const deploymentLogRepository = require("../repositories/deployment-log.repository");
              const exitMsg = status.exitCode !== undefined && status.exitCode !== null ? ` with exit code ${status.exitCode}` : "";
              const oomMsg = status.oomKilled ? " (OOM Killed - Application Exceeded Memory Limit)" : "";
              await deploymentLogRepository.addLog(
                deployment.id,
                `[Watchdog] Container stopped running${exitMsg}${oomMsg}. Marked as crashed.`,
                "error",
                "system",
              );
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      console.error("[RuntimeMonitor] Inspection error:", err);
      try {
        const notificationService = require("./notification.service");
        notificationService
          .notifyCriticalError({
            error: err,
            source: "Runtime Container Monitor",
          })
          .catch(() => {});
      } catch (_) {}
    }
  }, CHECK_INTERVAL);
};

module.exports = {
  start,
};
