const path = require("path");
const filesystem = require("./filesystem.service");

const storeUploadedFile = async ({
  workspaceRoot,
  uploadedFile,
  relativePath,
}) => {
  const finalPath = path.join(workspaceRoot, relativePath);

  await filesystem.ensureDirectory(path.dirname(finalPath));

  await filesystem.moveUploadedFile(uploadedFile.path, finalPath);

  return finalPath;
};

module.exports = {
  storeUploadedFile,
};
