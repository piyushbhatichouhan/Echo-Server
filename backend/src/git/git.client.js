const simpleGit = require("simple-git");

const getRepository = (directory) => {
  return simpleGit(directory);
};

module.exports = {
  getRepository,
};
