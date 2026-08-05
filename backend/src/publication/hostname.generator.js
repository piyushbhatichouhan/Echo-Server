const publicationRepository = require("./publication.repository");

const reserved = require("./reservedHostnames");
const MAX_HOSTNAME_LENGTH = 63;
const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const generateHostname = async (username, projectName) => {
  const base = `${slugify(username)}-${slugify(projectName)}`;

  let hostname = base;
  let counter = 2;
  if (hostname.length > MAX_HOSTNAME_LENGTH) {
    hostname = hostname.slice(0, MAX_HOSTNAME_LENGTH);

    hostname = hostname.replace(/-+$/, "");
  }
  if (reserved.has(hostname)) {
    const err = new Error(`"${hostname}" is a reserved hostname.`);

    err.status = 409;

    throw err;
  }

  while (true) {
    const existing = await publicationRepository.getDomainByHostname(hostname);

    if (!existing) {
      return `${hostname}.devpiyush.in`;
    }

    hostname = `${base}-${counter}`;
    counter++;
  }
};

module.exports = {
  generateHostname,
};
