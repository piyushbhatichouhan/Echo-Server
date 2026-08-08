const { getCloudRoot } = require("../storage/cloud.storage.manager");
const { relativeJoin } = require("./relativePath");

const resolveCloudStoragePath = (ownerId, relativePath) => {
  return relativeJoin(
    relativeJoin(getCloudRoot(ownerId), "files"),
    relativePath,
  );
};

module.exports = {
  resolveCloudStoragePath,
};
