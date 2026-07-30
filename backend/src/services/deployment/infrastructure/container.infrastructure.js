const containerService = require("../../container.service");
const { getStatus } = require("../runtimes/node.runtime");

module.exports = {
  getContainerName: containerService.getContainerName,

  create: containerService.createContainer,

  start: containerService.startContainer,

  stop: containerService.stopContainer,

  restart: containerService.restartContainer,

  stopByProject: containerService.stopContainerByProject,

  removeByProject: containerService.removeContainerByProject,

  remove: containerService.removeContainer,

  startByProject: containerService.startContainerByProject,

  getStatus: containerService.getContainerStatus,
};
