const webserver = require("../../webserver/webserver.service");

const publishStaticSite = async (context) => {
  return webserver.publishStaticSite(context);
};

module.exports = {
  publishStaticSite,
};
