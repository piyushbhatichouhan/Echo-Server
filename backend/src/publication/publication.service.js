const projectService = require("../services/project.service");
const publicationRepository = require("./publication.repository");
const hostnameGenerator = require("./hostname.generator");
const routingService = require("../routing/routing.service");
const { pool } = require("../config/database");

const getProjectListeningPort = async (projectId) => {
  const deploymentRes = await pool.query(
    `SELECT container_port FROM deployments WHERE project_id = $1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`,
    [projectId],
  );
  return Number(deploymentRes.rows[0]?.container_port) || 3000;
};

const publishProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  let publication = await publicationRepository.getProjectDomain(projectId);

  if (publication) {
    throw new Error("Project is already published.");
  }

  const project = await projectService.getProjectById(projectId, ownerId);

  const hostname = await hostnameGenerator.generateHostname(
    project.username,
    project.name,
  );

  publication = await publicationRepository.createProjectDomain(
    projectId,
    hostname,
  );

  const port = await getProjectListeningPort(projectId);

  // Wire reverse proxy route in NPM
  try {
    await routingService.publish({
      projectId,
      hostname: publication.hostname,
      port,
    });
  } catch (err) {
    console.warn(`[Publication] Routing proxy warning for ${hostname}:`, err.message);
  }

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

  // Remove reverse proxy route from NPM
  try {
    await routingService.unpublish({ projectId });
  } catch (err) {
    console.warn(`[Publication] Routing unpublish warning:`, err.message);
  }

  await publicationRepository.deleteProjectDomain(projectId);

  return true;
};

const republishProject = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const publication = await publicationRepository.getProjectDomain(projectId);

  if (!publication || publication.publication_status !== "active") {
    return null;
  }

  const port = await getProjectListeningPort(projectId);

  // Refresh reverse proxy route in NPM
  try {
    await routingService.publish({
      projectId,
      hostname: publication.hostname,
      port,
    });
  } catch (err) {
    console.warn(`[Publication] Routing refresh warning for ${publication.hostname}:`, err.message);
  }

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
