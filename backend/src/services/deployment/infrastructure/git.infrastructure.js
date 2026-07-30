const gitService = require("../../git.service");

module.exports = {
  getRepository: gitService.getRepository,

  updateRepository: gitService.updateRepository,
};
