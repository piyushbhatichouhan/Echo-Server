const projectService = require("../services/project.service");

const publicationRepository = require("./publication.repository");
const hostnameGenerator = require("./hostname.generator");
const routing = require("../routing").service;
const routingService = require("../routing/routing.service");

const publishProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const existing = await publicationRepository.getProjectDomain(projectId);

  if (existing) {
    throw new Error("Project is already published.");
  }

  const project = await projectService.getProjectById(projectId, ownerId);

  const hostname = await hostnameGenerator.generateHostname(
    project.username,
    project.name,
  );

  const publication = await publicationRepository.createProjectDomain(
    projectId,
    hostname,
  );

  try {
    await routingService.publish({
      projectId,
      hostname,
      port: project.port,
    });

    await publicationRepository.updateProjectDomain(publication.id, {
      publication_status: "active",
      verification_status: "verified",
    });

    return publication;
  } catch (err) {
    await publicationRepository.updateProjectDomain(publication.id, {
      publication_status: "failed",
      verification_status: "pending",
    });

    throw err;
  }
};

const getPublication = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return publicationRepository.getProjectDomain(projectId);
};

const unpublishProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const publication = await publicationRepository.getProjectDomain(projectId);

  if (!publication) {
    throw new Error("Project is not published.");
  }

  await routingService.unpublish({
    projectId,
    hostname: publication.hostname,
  });

  await publicationRepository.deleteProjectDomain(projectId);

  return true;
};

const republishProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const publication = await publicationRepository.getProjectDomain(projectId);

  if (!publication) {
    return null;
  }

  const project = await projectService.getProjectById(projectId, ownerId);

  try {
    await routingService.publish({
      projectId,
      hostname: publication.hostname,
      port: project.port,
    });

    await publicationRepository.updateProjectDomain(publication.id, {
      publication_status: "active",
      verification_status: "verified",
    });

    return publication;
  } catch (err) {
    await publicationRepository.updateProjectDomain(publication.id, {
      publication_status: "failed",
      verification_status: "pending",
    });

    throw err;
  }
};

module.exports = {
  publishProject,
  getPublication,
  unpublishProject,
  republishProject,
};
