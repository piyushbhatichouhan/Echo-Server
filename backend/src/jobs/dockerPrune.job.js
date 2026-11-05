const docker = require("../docker/docker.client");
const { addServerLog } = require("../services/serverLog.service");

/**
 * Runs garbage collection across Docker layers, dangling images, and stopped containers.
 * Protects SSD from running out of inodes and space.
 */
const runDockerPruneJob = async () => {
  try {
    let imagesDeleted = 0;
    let spaceReclaimedBytes = 0;
    let containersDeleted = 0;

    // 1. Prune stopped containers
    try {
      const containerRes = await docker.pruneContainers();
      containersDeleted = containerRes?.ContainersDeleted?.length || 0;
      spaceReclaimedBytes += Number(containerRes?.SpaceReclaimed || 0);
    } catch (err) {
      console.warn("[DockerPrune] Container prune warning:", err.message);
    }

    // 2. Prune dangling images (<none> intermediate layers from builds)
    try {
      const imageRes = await docker.pruneImages({
        filters: { dangling: { true: true } },
      });
      imagesDeleted = imageRes?.ImagesDeleted?.length || 0;
      spaceReclaimedBytes += Number(imageRes?.SpaceReclaimed || 0);
    } catch (err) {
      console.warn("[DockerPrune] Image prune warning:", err.message);
    }

    // 3. Prune builder cache if available
    try {
      if (typeof docker.pruneBuilder === "function") {
        const buildRes = await docker.pruneBuilder();
        spaceReclaimedBytes += Number(buildRes?.SpaceReclaimed || 0);
      }
    } catch {}

    const reclaimedMB = (spaceReclaimedBytes / (1024 * 1024)).toFixed(1);
    const summary = `Docker garbage collection completed: ${imagesDeleted} dangling images, ${containersDeleted} stopped containers pruned (${reclaimedMB} MB reclaimed).`;

    addServerLog({
      level: "info",
      source: "docker",
      message: summary,
      details: {
        imagesDeleted,
        containersDeleted,
        spaceReclaimedBytes,
      },
    });

    console.log(`[DockerPrune] ${summary}`);

    return {
      success: true,
      imagesDeleted,
      containersDeleted,
      spaceReclaimedBytes,
      reclaimedMB: Number(reclaimedMB),
      message: summary,
    };
  } catch (err) {
    const errorMsg = `Docker prune failed: ${err.message}`;
    addServerLog({
      level: "warn",
      source: "docker",
      message: errorMsg,
    });
    console.warn(`[DockerPrune] ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
};

module.exports = {
  runDockerPruneJob,
};
