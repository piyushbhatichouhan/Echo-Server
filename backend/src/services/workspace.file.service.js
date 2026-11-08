const path = require("path");
const filesystem = require("./filesystem.service");

const storeUploadedFile = async ({
  workspaceRoot,
  uploadedFile,
  relativePath,
}) => {
  const root = path.resolve(workspaceRoot);
  const cleanRelative = (relativePath || "").replace(/\\/g, "/");
  const finalPath = path.resolve(root, cleanRelative);

  // Strictly block path traversal: finalPath must reside inside workspaceRoot
  if (finalPath !== root && !finalPath.startsWith(root + path.sep)) {
    const error = new Error("Path traversal detected in file upload target");
    error.status = 400;
    throw error;
  }

  await filesystem.ensureDirectory(path.dirname(finalPath));

  await filesystem.moveUploadedFile(uploadedFile.path, finalPath);

  return finalPath;
};

module.exports = {
  storeUploadedFile,
};
