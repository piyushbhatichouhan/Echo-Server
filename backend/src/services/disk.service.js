const path = require("path");
const { default: checkDiskSpace } = require("check-disk-space");

const workspace = require("./workspace.service");

const getDiskInfo = async () => {
  // Use the drive where EchoHub stores data
  const storageRoot = workspace.getStorageRoot();

  const root = path.parse(storageRoot).root;

  return await checkDiskSpace(root);
};

module.exports = {
  getDiskInfo,
};
