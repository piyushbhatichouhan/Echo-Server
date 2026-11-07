const projectService = require("../services/project.service");
const publicationRepository = require("./publication.repository");
const hostnameGenerator = require("./hostname.generator");
const routingService = require("../routing/routing.service");
const userRepository = require("../repositories/user.repository");
const { pool } = require("../config/database");

const getProjectListeningPort = async (projectId) => {
  const deploymentRes = await pool.query(
    `SELECT container_port, port FROM deployments WHERE project_id = $1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`,
    [projectId],
  );
  if (process.env.NPM_FORWARD_MODE === "docker") {
    return Number(deploymentRes.rows[0]?.container_port) || 3000;
  }
  return (
    Number(deploymentRes.rows[0]?.port) ||
    Number(deploymentRes.rows[0]?.container_port) ||
    3000
  );
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

    // Unless user is Super Admin or bypass requested, enforce approved request
    if (!isOwner && !options.bypassApprovalCheck) {
      const approvedReq = await publicationRepository.getApprovedSubdomainRequest(
        projectId,
        validation.subdomain,
      );
      if (!approvedReq) {
        const err = new Error(
          `The custom subdomain "${validation.subdomain}" has not been approved by the Super Admin for this project. Please submit a request first.`,
        );
        err.status = 403;
        throw err;
      }
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
  if (!options.bypassOwnershipCheck) {
    await projectService.verifyProjectOwnership(projectId, ownerId);
  }

  const publication = await publicationRepository.getProjectDomain(projectId);
  if (!publication) {
    const err = new Error("Project is not published. Please publish it first.");
    err.status = 404;
    throw err;
  }

  if (!ownerId && options.bypassOwnershipCheck) {
    const projRes = await pool.query(
      `SELECT owner_id FROM projects WHERE id = $1`,
      [projectId],
    );
    if (projRes.rows[0]) {
      ownerId = projRes.rows[0].owner_id;
    }
  }

  const user = await userRepository.getUserById(ownerId);
  const isOwner = Boolean(user?.is_owner);
  const canCustom = Boolean(user?.is_owner || user?.can_custom_subdomain);

  const { customSubdomain, subdomainType = "custom" } = options;

  let targetHostname;
  let isCustom = false;
  let customDomain = null;

  if (subdomainType === "custom" || (customSubdomain && customSubdomain.trim())) {
    if (!canCustom && !options.bypassApprovalCheck) {
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

    // Unless user is Super Admin or bypass requested, enforce approved request
    if (!isOwner && !options.bypassApprovalCheck) {
      const approvedReq = await publicationRepository.getApprovedSubdomainRequest(
        projectId,
        validation.subdomain,
      );
      if (!approvedReq) {
        const err = new Error(
          `The custom subdomain "${validation.subdomain}" has not been approved by the Super Admin for this project. Please submit a request first.`,
        );
        err.status = 403;
        throw err;
      }
    }

    targetHostname = validation.hostname;
    isCustom = true;
    customDomain = validation.subdomain;
  } else {
    // Revert to standard default subdomain (username-project.devpiyush.in)
    let project;
    if (options.bypassOwnershipCheck) {
      const projRes = await pool.query(
        `SELECT p.*, u.username FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
        [projectId],
      );
      project = projRes.rows[0];
    } else {
      project = await projectService.getProjectById(projectId, ownerId);
    }

    if (!project) {
      const err = new Error("Project details not found.");
      err.status = 404;
      throw err;
    }

    targetHostname = await hostnameGenerator.generateHostname(
      project.username,
      project.name,
    );
  }

  // If the target hostname is identical to the current hostname and custom flag matches, simply return existing
  if (targetHostname === publication.hostname && Boolean(publication.is_custom) === isCustom) {
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

const getSubdomainRequest = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);
  return await publicationRepository.getSubdomainRequestByProject(projectId);
};

const requestCustomSubdomain = async (projectId, ownerId, rawSubdomain) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const user = await userRepository.getUserById(ownerId);
  const isOwner = Boolean(user?.is_owner);
  const canCustom = Boolean(user?.is_owner || user?.can_custom_subdomain);

  if (!canCustom) {
    const err = new Error(
      "You must have custom subdomain privilege granted by the Super Admin to request a custom subdomain.",
    );
    err.status = 403;
    throw err;
  }

  const validation = await hostnameGenerator.validateCustomSubdomain(
    rawSubdomain,
    isOwner,
    projectId,
  );

  if (!validation.valid) {
    const err = new Error(validation.message);
    err.status = 400;
    throw err;
  }

  // Super Admin requests are immediately auto-approved; regular developer requests are 'pending'
  const status = isOwner ? "approved" : "pending";
  const reviewedBy = isOwner ? ownerId : null;
  const reviewedAt = isOwner ? new Date() : null;

  const request = await publicationRepository.createOrUpdateSubdomainRequest(
    projectId,
    ownerId,
    validation.subdomain,
    validation.hostname,
    status,
  );

  if (isOwner) {
    await publicationRepository.updateSubdomainRequestStatus(request.id, {
      status: "approved",
      reviewedBy,
      reviewedAt,
    });
    request.status = "approved";
  } else {
    // Notify Super Admin of incoming custom subdomain request (non-blocking)
    try {
      const notificationService = require("../services/notification.service");
      let project = null;
      try {
        project = await projectService.getProjectById(projectId, ownerId);
      } catch (_) {}

      notificationService
        .notifySubdomainRequest({
          project: project || { id: projectId, name: "Project" },
          user: {
            id: ownerId,
            username: user?.username || "developer",
            email: user?.email || "developer@domain",
          },
          subdomain: validation.subdomain,
          hostname: validation.hostname,
          requestId: request.id,
        })
        .catch((mailErr) => {
          console.warn("[Publication] Subdomain request notification warning:", mailErr.message);
        });
    } catch (notifErr) {
      console.warn("[Publication] Failed to queue subdomain notification:", notifErr.message);
    }
  }

  return request;
};

const cancelSubdomainRequest = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);
  await publicationRepository.deleteSubdomainRequestByProject(projectId);
  return { success: true, message: "Subdomain request cancelled." };
};

module.exports = {
  checkCustomSubdomainAvailability,
  publishProject,
  getPublication,
  unpublishProject,
  republishProject,
  updateSubdomain,
  getSubdomainRequest,
  requestCustomSubdomain,
  cancelSubdomainRequest,
};
