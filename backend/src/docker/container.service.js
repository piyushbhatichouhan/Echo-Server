const docker = require("./docker.client");

const listContainers = async () => {
  return await docker.listContainers({
    all: true,
  });
};

module.exports = listContainers;
