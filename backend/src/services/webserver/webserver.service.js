const nginx = require("./nginx.adapter");

const publishStaticSite = async (context) => {
  return nginx.publishStaticSite(context);
};

const removeStaticSite = async (projectId) => {
  return await nginx.removeStaticSite(projectId);
};

module.exports = {
  publishStaticSite,
  removeStaticSite,
};
