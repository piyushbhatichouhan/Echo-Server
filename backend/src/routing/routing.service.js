const repository = require("./npm.repository");
const health = require("./health.service");
const publicationRepository = require("../publication/publication.repository");

const publish = async ({ projectId, hostname, port }) => {
  console.log(`[Routing] Publishing ${hostname}`);

  await repository.publishHost({
    projectId,
    hostname,
    port,
  });
  const healthy = await health.checkPublication(hostname);

  if (!healthy) {
    throw new Error("Publication health check failed.");
  }
  return true;
};

const unpublish = async ({ projectId }) => {
  const domain = await publicationRepository.getProjectDomain(projectId);

  if (!domain) {
    return true;
  }

  console.log(`[Routing] Removing ${domain.hostname}`);

  // Remove proxy from NPM
  await repository.removeHost({
    hostname: domain.hostname,
  });

  // Remove publication from database
  await publicationRepository.deleteProjectDomain(projectId);

  return true;
};
module.exports = {
  publish,
  unpublish,
};
