const docker = require("./docker.client");

const ping = async () => {
  try {
    await docker.ping();

    return true;
  } catch {
    return false;
  }
};

const getInfo = async () => {
  return await docker.info();
};

module.exports = {
  ping,

  getInfo,
};
