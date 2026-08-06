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

  await publicationRepository.updateProjectDomain(publication.id, {
    publication_status: "active",
    verification_status: "verified",
  });

  return publication;
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

  await publicationRepository.updateProjectDomain(publication.id, {
    publication_status: "active",
    verification_status: "verified",
  });

  return publication;
};

module.exports = {
  publishProject,
  getPublication,
  unpublishProject,
  republishProject,
};
