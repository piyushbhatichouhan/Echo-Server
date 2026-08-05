const { slugify } = require("./slug.util");

const DOMAIN = process.env.DEFAULT_DOMAIN || "devpiyush.in";

const buildHostname = (username, projectName) => {
  const user = slugify(username);

  const project = slugify(projectName);

  return `${user}-${project}.${DOMAIN}`;
};

module.exports = {
  buildHostname,
};
