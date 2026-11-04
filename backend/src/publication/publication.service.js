const projectService = require("../services/project.service");
const publicationRepository = require("./publication.repository");
const hostnameGenerator = require("./hostname.generator");
const routingService = require("../routing/routing.service");
const userRepository = require("../repositories/user.repository");
const { pool } = require("../config/database");

const getProjectListeningPort = async (projectId) => {
  const deploymentRes = await pool.query(
    `SELECT container_port FROM deployments WHERE project_id = $1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`,
    [projectId],
  );
  return Number(deploymentRes.rows[0]?.container_port) || 3000;
};

/**
 * Checks if a requested custom subdomain is available for the given user.
 */
const checkCustomSubdomainAvailability = async (subdomain, userId, projectId = null) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    const err = new Error("User not found.");
    err.status = 404;
    throw err;
  }

  const isOwner = Boolean(user.is_owner);
  const canCustom = Boolean(user.is_owner || user.can_custom_subdomain);

  if (!canCustom) {
    return {
      available: false,
      reason: "NOT_PERMITTED",
      message: "You do not have permission to claim custom subdomains. Contact the Super Admin for access.",
    };
  }

  const validation = await hostnameGenerator.validateCustomSubdomain(
    subdomain,
    isOwner,
    projectId,
  );

  return {
    available: validation.valid,
    subdomain: validation.subdomain,
    hostname: validation.hostname,
    message: validation.message,
    reason: validation.reason,
    isCurrent: Boolean(validation.isCurrent),
  };
};

const publishProject = async (projectId, ownerId, options = {}) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  let publication = await publicationRepository.getProjectDomain(projectId);

  if (publication) {
    throw new Error("Project is already published.");
  }

  const project = await projectService.getProjectById(projectId, ownerId);
  const user = await userRepository.getUserById(ownerId);

  const { customSubdomain, subdomainType = "default" } = options;

  let hostname;
  let isCustom = false;
  let customDomain = null;

  if (subdomainType === "custom" || (customSubdomain && customSubdomain.trim())) {
    const isOwner = Boolean(user?.is_owner);
    const canCustom = Boolean(user?.is_owner || user?.can_custom_subdomain);

    if (!canCustom) {
      const err = new Error(
        "Custom subdomain privilege is restricted to authorized accounts. Please contact the Super Admin.",
      );
      err.status = 403;
      throw err;
    }

    const validation = await hostnameGenerator.validateCustomSubdomain(
      customSubdomain,
      isOwner,
    );

    if (!validation.valid) {
      const err = new Error(validation.message);
      err.status = 400;
      throw err;
    }

    hostname = validation.hostname;
    isCustom = true;
    customDomain = validation.subdomain;
  } else {
    hostname = await hostnameGenerator.generateHostname(
      project.username,
      project.name,
    );
  }

  publication = await publicationRepository.createProjectDomain(
    projectId,
    hostname,
    {
      isCustom,
      customDomain,
      isPrimary: true,
    },
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

const updateSubdomain = async (projectId, ownerId, options = {}) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const publication = await publicationRepository.getProjectDomain(projectId);
  if (!publication) {
    const err = new Error("Project is not published. Please publish it first.");
    err.status = 404;
    throw err;
  }

  const user = await userRepository.getUserById(ownerId);
  const isOwner = Boolean(user?.is_owner);
  const canCustom = Boolean(user?.is_owner || user?.can_custom_subdomain);

  const { customSubdomain, subdomainType = "custom" } = options;

  let targetHostname;
  let isCustom = false;
  let customDomain = null;

  if (subdomainType === "custom" || (customSubdomain && customSubdomain.trim())) {
    if (!canCustom) {
      const err = new Error(
        "Custom subdomain privilege is restricted to authorized accounts. Please contact the Super Admin.",
      );
      err.status = 403;
      throw err;
    }

    const validation = await hostnameGenerator.validateCustomSubdomain(
      customSubdomain,
      isOwner,
      projectId,
    );

    if (!validation.valid) {
      const err = new Error(validation.message);
      err.status = 400;
      throw err;
    }

    targetHostname = validation.hostname;
    isCustom = true;
    customDomain = validation.subdomain;
  } else {
    // Revert to standard default subdomain (username-project.devpiyush.in)
    const project = await projectService.getProjectById(projectId, ownerId);
    targetHostname = await hostnameGenerator.generateHostname(
      project.username,
      project.name,
    );
  }

  // If the target hostname is identical to the current hostname, simply return existing
  if (targetHostname === publication.hostname) {
    return publication;
  }

  const oldHostname = publication.hostname;
  const port = await getProjectListeningPort(projectId);

  // 1. Remove old route from NPM reverse proxy
  try {
    const npmRepository = require("../routing/npm.repository");
    await npmRepository.removeHost({ hostname: oldHostname });
  } catch (err) {
    console.warn(
      `[Publication] Warning removing old proxy host ${oldHostname}:`,
      err.message,
    );
  }

  // 2. Publish new route in NPM reverse proxy
  try {
    await routingService.publish({
      projectId,
      hostname: targetHostname,
      port,
    });
  } catch (err) {
    console.warn(
      `[Publication] Warning creating new proxy host ${targetHostname}:`,
      err.message,
    );
  }

  // 3. Update database record in project_domains
  const updatedPublication = await publicationRepository.updateProjectDomain(
    publication.id,
    {
      hostname: targetHostname,
      is_custom: isCustom,
      custom_domain: customDomain,
      publication_status: "active",
      verification_status: "verified",
    },
  );

  return updatedPublication;
};

module.exports = {
  checkCustomSubdomainAvailability,
  publishProject,
  getPublication,
  unpublishProject,
  republishProject,
  updateSubdomain,
};
