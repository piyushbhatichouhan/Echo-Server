const userRepository = require("../repositories/user.repository");
const publicationRepository = require("../publication/publication.repository");
const publicationService = require("../publication/publication.service");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

const getUsers = async () => {
  return await userRepository.getUsers();
};

const disableUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.is_owner) {
    throw new Error("Super Admin cannot be disabled");
  }

  return await userRepository.updateDisabledStatus(userId, true);
};

const enableUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return await userRepository.updateDisabledStatus(userId, false);
};

const deleteUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }
  if (user.is_owner) {
    throw new Error("Owner account cannot be deleted");
  }
  if (user.pending_deletion) {
    throw new Error("User is already scheduled for deletion");
  }

  await userRepository.scheduleUserDeletion(userId);

  return {
    success: true,
    message: "User scheduled for deletion.",
  };
};

const restoreUser = async (userId) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.pending_deletion) {
    throw new Error("User is not pending deletion");
  }

  await userRepository.restoreUser(userId);

  return {
    success: true,
    message: "User restored successfully.",
  };
};

const setCustomSubdomainAccess = async (userId, enabled) => {
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.is_owner) {
    throw new Error("Super Admin already has custom subdomain privileges.");
  }

  const updatedUser = await userRepository.updateCustomSubdomainAccess(userId, enabled);

  if (!enabled) {
    // When custom subdomain privilege is revoked:
    // 1. Mark all pending/approved subdomain requests for this user as rejected
    try {
      await publicationRepository.rejectAllUserSubdomainRequests(
        userId,
        "Custom subdomain privilege was revoked by the Super Admin.",
      );
    } catch (err) {
      console.warn(
        `[AdminService] Warning rejecting subdomain requests for revoked user ${userId}:`,
        err.message,
      );
    }

    // 2. Automatically revert all projects currently published on a custom subdomain back to the standard domain
    try {
      const customProjects = await publicationRepository.getUserCustomPublishedProjects(userId);
      for (const proj of customProjects) {
        await publicationService.updateSubdomain(proj.project_id, userId, {
          subdomainType: "default",
          bypassApprovalCheck: true,
          bypassOwnershipCheck: true,
        });
        console.log(
          `[AdminService] Reverted project ${proj.project_id} to standard domain after custom subdomain privilege was revoked.`,
        );
      }
    } catch (err) {
      console.warn(
        `[AdminService] Warning reverting custom published projects for revoked user ${userId}:`,
        err.message,
      );
    }
  }

  return updatedUser;
};

const getSubdomainRequests = async (filters = {}) => {
  return await publicationRepository.listSubdomainRequests(filters);
};

const getSubdomainRequestStats = async () => {
  return await publicationRepository.getSubdomainRequestStats();
};

const approveSubdomainRequest = async (requestId, adminId) => {
  const req = await publicationRepository.getSubdomainRequestById(requestId);
  if (!req) {
    const err = new Error("Subdomain request not found.");
    err.status = 404;
    throw err;
  }

  // Check collision against active publications
  const existingDomain = await publicationRepository.getDomainByHostname(req.hostname);
  if (existingDomain && String(existingDomain.project_id) !== String(req.project_id)) {
    const err = new Error(`Hostname "${req.hostname}" is already in use by another project.`);
    err.status = 409;
    throw err;
  }

  const updatedRequest = await publicationRepository.updateSubdomainRequestStatus(requestId, {
    status: "approved",
    adminNotes: null,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  // If the project is already published, seamlessly update its live routing to the approved custom subdomain
  try {
    const pub = await publicationRepository.getProjectDomain(req.project_id);
    if (pub && pub.publication_status === "active") {
      await publicationService.updateSubdomain(req.project_id, req.user_id, {
        subdomainType: "custom",
        customSubdomain: req.subdomain,
        bypassApprovalCheck: true,
        bypassOwnershipCheck: true,
      });
    }
  } catch (err) {
    console.warn(`[AdminService] Auto-update published domain warning for project ${req.project_id}:`, err.message);
  }

  return updatedRequest;
};

const rejectSubdomainRequest = async (requestId, adminId, reason = null) => {
  const req = await publicationRepository.getSubdomainRequestById(requestId);
  if (!req) {
    const err = new Error("Subdomain request not found.");
    err.status = 404;
    throw err;
  }

  const rejectionReason = reason?.trim() || "Declined by administrator.";

  const updatedRequest = await publicationRepository.updateSubdomainRequestStatus(requestId, {
    status: "rejected",
    adminNotes: rejectionReason,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  // If the project is currently published and using this custom subdomain (or any custom subdomain),
  // immediately revert it back to the standard default domain!
  try {
    const pub = await publicationRepository.getProjectDomain(req.project_id);
    if (pub && (pub.is_custom || pub.hostname === req.hostname)) {
      await publicationService.updateSubdomain(req.project_id, req.user_id, {
        subdomainType: "default",
        bypassApprovalCheck: true,
        bypassOwnershipCheck: true,
      });
      console.log(
        `[AdminService] Reverted project ${req.project_id} from revoked custom subdomain (${pub.hostname}) to standard domain.`,
      );
    }
  } catch (err) {
    console.warn(
      `[AdminService] Revert custom subdomain warning for project ${req.project_id}:`,
      err.message,
    );
  }

  return updatedRequest;
};

const deleteSubdomainRequest = async (requestId) => {
  const req = await publicationRepository.getSubdomainRequestById(requestId);
  if (!req) {
    const err = new Error("Subdomain request not found.");
    err.status = 404;
    throw err;
  }

  // If the project is currently published on this custom domain, revert it to standard domain first
  try {
    const pub = await publicationRepository.getProjectDomain(req.project_id);
    if (pub && (pub.is_custom || pub.hostname === req.hostname)) {
      await publicationService.updateSubdomain(req.project_id, req.user_id, {
        subdomainType: "default",
        bypassApprovalCheck: true,
        bypassOwnershipCheck: true,
      });
    }
  } catch (err) {
    console.warn(
      `[AdminService] Revert custom subdomain warning on delete for project ${req.project_id}:`,
      err.message,
    );
  }

  await publicationRepository.deleteSubdomainRequestById(requestId);
  return { success: true, message: "Subdomain request removed." };
};

module.exports = {
  getUsers,
  disableUser,
  enableUser,
  deleteUser,
  restoreUser,
  setCustomSubdomainAccess,
  getSubdomainRequests,
  getSubdomainRequestStats,
  approveSubdomainRequest,
  rejectSubdomainRequest,
  deleteSubdomainRequest,
};
