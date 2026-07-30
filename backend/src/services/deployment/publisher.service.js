const fs = require("fs/promises");
const path = require("path");
const storage = require("../../config/storage");

const copyDirectory = async (source, destination) => {
  await fs.rm(destination, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(path.dirname(destination), {
    recursive: true,
  });

  await fs.cp(source, destination, {
    recursive: true,
  });
};

const getPublishedDirectory = (projectId) => {
  return path.join(storage.published, projectId.toString());
};

module.exports = {
  copyDirectory,
  getPublishedDirectory,
};
