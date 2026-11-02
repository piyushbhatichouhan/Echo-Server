const path = require("path");
const { getCloudRoot } = require("../storage/cloud.storage.manager");

const resolveCloudStoragePath = (ownerId, relativePath) => {
  const root = path.resolve(getCloudRoot(ownerId), "files");
  const cleanRelative = (relativePath || "").replace(/\\/g, "/");
  const resolved = path.resolve(root, cleanRelative);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    const error = new Error("Path traversal detected");
    error.status = 400;
    throw error;
  }
  return resolved;
};

module.exports = {
  resolveCloudStoragePath,
};
