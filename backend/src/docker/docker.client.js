const Docker = require("dockerode");

const docker = new Docker({
  socketPath: "//./pipe/docker_engine",
});

module.exports = docker;
