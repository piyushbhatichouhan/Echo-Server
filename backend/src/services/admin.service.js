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
    const revertedProjects = [];
    try {
      const customProjects = await publicationRepository.getUserCustomPublishedProjects(userId);
      for (const proj of customProjects) {
        const revertedPub = await publicationService.updateSubdomain(proj.project_id, userId, {
          subdomainType: "default",
          bypassApprovalCheck: true,
          bypassOwnershipCheck: true,
        });
        revertedProjects.push({
          id: proj.project_id,
          name: proj.name || "Project",
          oldHostname: proj.hostname,
          revertedHostname: revertedPub?.hostname || "standard default domain",
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

    // 3. Mail user on their registered account email that their custom subdomain access has been revoked
    if (user.email) {
      try {
        const notificationService = require("./notification.service");
        await notificationService.notifyDeveloperPrivilegeRevoked({
          user,
          revertedProjects,
          reason: "Custom subdomain privilege was revoked by the Super Administrator.",
        });
        console.log(
          `[AdminService] Privilege revocation email notice delivered to registered email: ${user.email}`,
        );
      } catch (mailErr) {
        console.warn(
          `[AdminService] Privilege revocation email notice warning for ${user.email}:`,
          mailErr.message,
        );
      }
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

const revokeCustomSubdomain = async (identifier, adminId, reason = null) => {
  // identifier can be a requestId (UUID from subdomain_requests or project_domains) or a projectId
  let req = await publicationRepository.getSubdomainRequestById(identifier);
  if (!req) {
    req = await publicationRepository.getSubdomainRequestByProject(identifier);
  }
  if (!req) {
    // Check if there is an active project_domain for this project
    const pub = await publicationRepository.getProjectDomain(identifier);
    if (pub && pub.is_custom) {
      const { pool } = require("../config/database");
      const projRes = await pool.query(
        `SELECT p.name, p.owner_id, u.username, u.email FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
        [pub.project_id],
      );
      if (projRes.rows[0]) {
        req = {
          id: pub.id,
          project_id: pub.project_id,
          user_id: projRes.rows[0].owner_id,
          subdomain: pub.custom_domain || pub.hostname.split(".")[0],
          hostname: pub.hostname,
          project_name: projRes.rows[0].name,
          username: projRes.rows[0].username,
          email: projRes.rows[0].email,
        };
      }
    }
  }

  if (!req) {
    const err = new Error("Custom subdomain or project not found.");
    err.status = 404;
    throw err;
  }

  const rejectionReason =
    reason?.trim() || "Custom subdomain revoked by Super Administrator.";

  // 1. Upsert or update status in subdomain_requests
  const updatedRequest = await publicationRepository.createOrUpdateSubdomainRequest(
    req.project_id,
    req.user_id,
    req.subdomain,
    req.hostname,
    "rejected",
    rejectionReason,
  );

  await publicationRepository.updateSubdomainRequestStatus(updatedRequest.id, {
    status: "rejected",
    adminNotes: rejectionReason,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  // 2. Revert project's live reverse proxy and domain to default standard domain (username-project.devpiyush.in)
  let standardHostname = null;
  try {
    const pub = await publicationRepository.getProjectDomain(req.project_id);
    if (pub && (pub.is_custom || pub.hostname === req.hostname)) {
      const revertedPub = await publicationService.updateSubdomain(
        req.project_id,
        req.user_id,
        {
          subdomainType: "default",
          bypassApprovalCheck: true,
          bypassOwnershipCheck: true,
        },
      );
      standardHostname = revertedPub?.hostname || null;
      console.log(
        `[AdminService] Reverted project ${req.project_id} from revoked custom subdomain (${pub.hostname}) to standard domain (${standardHostname}).`,
      );
    }
  } catch (err) {
    console.warn(
      `[AdminService] Revert custom subdomain warning for project ${req.project_id}:`,
      err.message,
    );
  }

  // 3. Resolve project owner's registered account details directly from users table
  let registeredUser = null;
  const ownerIdToLookup = req.user_id || req.owner_id;
  if (ownerIdToLookup) {
    try {
      registeredUser = await userRepository.getUserById(ownerIdToLookup);
    } catch (_) {}
  }
  if (!registeredUser && req.project_id) {
    try {
      const { pool } = require("../config/database");
      const ownerRes = await pool.query(
        `SELECT u.id, u.username, u.email FROM users u JOIN projects p ON p.owner_id = u.id WHERE p.id = $1 LIMIT 1`,
        [req.project_id],
      );
      registeredUser = ownerRes.rows[0] || null;
    } catch (_) {}
  }

  const recipientUser = {
    id: registeredUser?.id || req.user_id,
    username: registeredUser?.username || req.username || req.developer_username || "Developer",
    email: registeredUser?.email || req.email || req.developer_email,
  };

  // If standardHostname was not generated from active publication, generate it dynamically
  if (!standardHostname && req.project_id) {
    try {
      const hostnameGenerator = require("../publication/hostname.generator");
      const uname = recipientUser.username;
      const pname = req.project_name || "project";
      if (uname && pname) {
        standardHostname = await hostnameGenerator.generateHostname(uname, pname);
      }
    } catch (_) {}
    if (!standardHostname) {
      const safeUname = (recipientUser.username || "user").toLowerCase();
      const safePname = (req.project_name || "project").toLowerCase().replace(/[^a-z0-9-]/g, "");
      standardHostname = `${safeUname}-${safePname}.devpiyush.in`;
    }
  }

  // 4. Notify the project owner on their registered account email
  let mailResult = null;
  if (recipientUser.email) {
    try {
      const notificationService = require("./notification.service");
      mailResult = await notificationService.notifyDeveloperSubdomainRevoked({
        project: { id: req.project_id, name: req.project_name || "Project" },
        user: recipientUser,
        subdomain: req.subdomain,
        hostname: req.hostname,
        standardHostname,
        reason: rejectionReason,
      });
      console.log(
        `[AdminService] Revocation notice email dispatched to registered email (${recipientUser.email}) for subdomain ${req.hostname}. Status:`,
        mailResult?.ok ? "DELIVERED" : mailResult?.error,
      );
    } catch (mailErr) {
      console.warn(
        `[AdminService] Developer revocation notice mail failed for ${recipientUser.email}:`,
        mailErr.message,
      );
    }
  } else {
    console.warn(
      `[AdminService] Cannot send revocation email: no registered email found for user ${recipientUser.id} on project ${req.project_id}`,
    );
  }

  return {
    ...updatedRequest,
    subdomain: req.subdomain,
    hostname: req.hostname,
    status: "rejected",
    adminNotes: rejectionReason,
    emailSent: mailResult?.ok === true,
    recipientEmail: recipientUser.email || null,
  };
};

const rejectSubdomainRequest = async (requestId, adminId, reason = null) => {
  return await revokeCustomSubdomain(requestId, adminId, reason);
};

const deleteSubdomainRequest = async (requestId) => {
  const req = await publicationRepository.getSubdomainRequestById(requestId);
  if (!req) {
    const err = new Error("Subdomain request not found.");
    err.status = 404;
    throw err;
  }

  // If the project is currently published on this custom domain, revert it to standard domain first
  let standardHostname = null;
  try {
    const pub = await publicationRepository.getProjectDomain(req.project_id);
    if (pub && (pub.is_custom || pub.hostname === req.hostname)) {
      const revertedPub = await publicationService.updateSubdomain(req.project_id, req.user_id, {
        subdomainType: "default",
        bypassApprovalCheck: true,
        bypassOwnershipCheck: true,
      });
      standardHostname = revertedPub?.hostname || null;
    }
  } catch (err) {
    console.warn(
      `[AdminService] Revert custom subdomain warning on delete for project ${req.project_id}:`,
      err.message,
    );
  }

  // Notify the project owner on their registered account email
  try {
    let registeredUser = null;
    if (req.user_id) {
      registeredUser = await userRepository.getUserById(req.user_id);
    }
    const recipientUser = {
      id: registeredUser?.id || req.user_id,
      username: registeredUser?.username || req.username || req.developer_username || "Developer",
      email: registeredUser?.email || req.email || req.developer_email,
    };
    if (recipientUser.email) {
      const notificationService = require("./notification.service");
      await notificationService.notifyDeveloperSubdomainRevoked({
        project: { id: req.project_id, name: req.project_name || "Project" },
        user: recipientUser,
        subdomain: req.subdomain,
        hostname: req.hostname,
        standardHostname:
          standardHostname ||
          `${(recipientUser.username || "user").toLowerCase()}-${(req.project_name || "project").toLowerCase().replace(/[^a-z0-9-]/g, "")}.devpiyush.in`,
        reason: "Subdomain reservation was removed by the Super Administrator.",
      });
    }
  } catch (mailErr) {
    console.warn("[AdminService] Delete notification email warning:", mailErr.message);
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
  revokeCustomSubdomain,
  deleteSubdomainRequest,
};
