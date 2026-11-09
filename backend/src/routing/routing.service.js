const repository = require("./npm.repository");
const health = require("./health.service");
const publicationRepository = require("../publication/publication.repository");

const publish = async ({
  projectId,
  hostname,
  port,
  containerName = null,
}) => {
  console.log(`[Routing] Publishing ${hostname}`);

  await repository.publishHost({
    projectId,
    hostname,
    port,
    containerName,
  });
  const healthy = await health.checkPublication(hostname);

  if (!healthy) {
    throw new Error("Publication health check failed.");
  }
  return true;
};

const unpublish = async ({ projectId }) => {
  const domains = await publicationRepository.listProjectDomains(projectId);

  if (domains && domains.length > 0) {
    for (const domain of domains) {
      console.log(`[Routing] Removing proxy host ${domain.hostname}`);
      try {
        await repository.removeHost({
          hostname: domain.hostname,
        });
      } catch (err) {
        console.warn(
          `[Routing] Failed to remove proxy host ${domain.hostname} from NPM:`,
          err.message,
        );
      }
    }
  }

  // Remove publication from database
  await publicationRepository.deleteProjectDomain(projectId);

  return true;
};
module.exports = {
  publish,
  unpublish,
};
