const path = require("path");

const isWindows = process.platform === "win32";

const isLinux = process.platform === "linux";

module.exports = {
  isWindows,
  isLinux,

  path,

  dockerSocket:
    process.env.DOCKER_SOCKET ||
    (isWindows ? "//./pipe/docker_engine" : "/var/run/docker.sock"),

  python: process.env.PYTHON_COMMAND || (isWindows ? "python" : "python3"),

  pip: process.env.PIP_COMMAND || (isWindows ? "pip" : "pip3"),

  npm: isWindows ? "npm.cmd" : "npm",

  npx: isWindows ? "npx.cmd" : "npx",

  nginxExecutable:
    process.env.NGINX_EXECUTABLE ||
    (isWindows ? "D:/nginx/nginx.exe" : "/usr/sbin/nginx"),

  nginxConfigDirectory:
    process.env.NGINX_CONFIG_DIRECTORY ||
    (isWindows ? "D:/nginx/conf/echohub" : "/etc/nginx/echohub"),
};
