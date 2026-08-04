const Docker = require("dockerode");

// Automatically uses:
// Windows -> Docker Desktop named pipe
// Linux -> /var/run/docker.sock
const docker = new Docker();

module.exports = docker;
