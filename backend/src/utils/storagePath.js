const { getCloudRoot } = require("../storage/cloud.storage.manager");
const { relativeJoin } = require("./relativePath");

function resolveCloudStoragePath(ownerId, relativePath) {
  return relativeJoin(getCloudRoot(ownerId), relativePath);
}

module.exports = {
  resolveCloudStoragePath,
};
