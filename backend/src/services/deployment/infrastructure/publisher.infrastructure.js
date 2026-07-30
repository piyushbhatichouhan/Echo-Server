const publisher = require("../publisher.service");

const getPublishedDirectory = (projectId) => {
  return publisher.getPublishedDirectory(projectId);
};

const copyDirectory = async (source, destination) => {
  return publisher.copyDirectory(source, destination);
};

module.exports = {
  getPublishedDirectory,
  copyDirectory,
};
