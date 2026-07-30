const fs = require("fs/promises");
const path = require("path");

const storage = require("../../config/storage");

const getSiteDirectory = (projectId) => {
  return path.join(storage.published, projectId.toString());
};

module.exports = {
  getSiteDirectory,
};
