const verificationService = require("../verification.service");

const verifyStaticDeployment = async (publishedDirectory) => {
  return verificationService.verifyStaticDeployment(publishedDirectory);
};

module.exports = {
  verifyStaticDeployment,
};
