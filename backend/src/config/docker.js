const Docker = require("dockerode");

// Let Dockerode automatically detect the platform:
// - Windows -> Docker Desktop named pipe
// - Linux -> /var/run/docker.sock
const docker = new Docker();

module.exports = docker;
