const docker = require("../docker/docker.client");

const getDockerInfo = async () => {
  return await docker.info();
};

module.exports = {
  getDockerInfo,
};
