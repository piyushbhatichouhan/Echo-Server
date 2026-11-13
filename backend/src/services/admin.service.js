const fs = require("fs/promises");
const { pool } = require("../config/database");
const userRepository = require("../repositories/user.repository");
const projectRepository = require("../repositories/project.repository");
const publicationRepository = require("../publication/publication.repository");
const publicationService = require("../publication/publication.service");
const projectCleanupService = require("./project-cleanup.service");
const { getCloudRoot } = require("../storage/cloud.storage.manager");

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
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.is_owner) {
    const error = new Error("Owner account cannot be deleted");
    error.status = 403;
    throw error;
  }

  console.log(`[deleteUser] Starting immediate permanent deletion for user ${user.username} (${userId})`);

  // 1. Fetch all projects owned by the user
  const projects = await projectRepository.getProjectsByOwner(userId);

  // 2. Perform deep physical cleanup for each project:
  // containers, images, routing hosts, and workspace directory on disk
  for (const project of projects) {
    try {
      await projectCleanupService.cleanupProject(project.id);
    } catch (cleanErr) {
      console.error(`[deleteUser] Error cleaning project ${project.id}:`, cleanErr);
    }
  }

  // 3. Remove user cloud storage directory on disk
  try {
    const cloudRoot = getCloudRoot(userId);
    await fs.rm(cloudRoot, { recursive: true, force: true });
  } catch (cloudErr) {
    console.error(`[deleteUser] Error removing cloud root for user ${userId}:`, cloudErr);
  }

  // 4. Atomically purge from database
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Remove all projects belonging to user (cascades to files, deployments, env vars, etc.)
    for (const project of projects) {
      await projectRepository.deleteProjectRecordTx(client, project.id);
    }

    // Remove user cloud_files records if any remained
    await client.query("DELETE FROM cloud_files WHERE owner_id = $1", [userId]);

    // Remove any user-level analytics
    await client.query("DELETE FROM http_analytics WHERE user_id = $1", [userId]);

    // Remove any subdomain requests
    await client.query("DELETE FROM subdomain_requests WHERE user_id = $1", [userId]);

    // Permanently remove user record
    await userRepository.deleteUserTx(client, userId);

    await client.query("COMMIT");
    console.log(`[deleteUser] User ${user.username} (${userId}) and all resources permanently deleted.`);
  } catch (dbErr) {
    await client.query("ROLLBACK");
    console.error(`[deleteUser] Database rollback for user ${userId}:`, dbErr);
    throw dbErr;
  } finally {
    client.release();
  }

  return {
    success: true,
    message: "User account and all associated resources permanently deleted.",
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
        standardHostname = await hostnameGenerator.generateHostname(
          uname,
          pname,
          { isOwner: true, canCustomSubdomain: true },
        );
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

const updateUserLimits = async (userId, limits = {}) => {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const ramLimitMb =
    limits.ramLimitMb !== undefined ? Number(limits.ramLimitMb) : undefined;
  const maxActiveProjects =
    limits.maxActiveProjects !== undefined
      ? Number(limits.maxActiveProjects)
      : undefined;
  const maxProjects =
    limits.maxProjects !== undefined ? Number(limits.maxProjects) : undefined;

  if (ramLimitMb !== undefined && (isNaN(ramLimitMb) || ramLimitMb < 64)) {
    const error = new Error("RAM limit must be at least 64 MB.");
    error.status = 400;
    throw error;
  }

  if (
    maxActiveProjects !== undefined &&
    (isNaN(maxActiveProjects) || maxActiveProjects < 1)
  ) {
    const error = new Error("Active projects limit must be at least 1.");
    error.status = 400;
    throw error;
  }

  if (maxProjects !== undefined && (isNaN(maxProjects) || maxProjects < 1)) {
    const error = new Error("Maximum projects must be at least 1.");
    error.status = 400;
    throw error;
  }

  return await userRepository.updateUserLimits(userId, {
    ramLimitMb,
    maxActiveProjects,
    maxProjects,
  });
};

const getUsersResourceUsage = async () => {
  const os = require("os");

  const usersRes = await pool.query(
    `
    SELECT
      id,
      username,
      email,
      is_owner,
      disabled,
      COALESCE(ram_limit_mb, 512) AS ram_limit_mb,
      COALESCE(max_active_projects, 2) AS max_active_projects,
      COALESCE(max_projects, 5) AS max_projects,
      COALESCE(quota_bytes, 0) AS quota_bytes,
      COALESCE(used_bytes, 0) AS used_bytes,
      created_at
    FROM users
    ORDER BY is_owner DESC, username ASC
    `,
  );
  const users = usersRes.rows;

  const projectsRes = await pool.query(
    `
    SELECT p.id, p.name, p.owner_id, p.application_type,
           COALESCE(d.status, 'Not Deployed') AS status
    FROM projects p
    LEFT JOIN LATERAL (
      SELECT status FROM deployments WHERE project_id = p.id ORDER BY updated_at DESC LIMIT 1
    ) d ON TRUE
    `,
  );
  const projects = projectsRes.rows;

  // Group projects by owner_id
  const projectsByOwner = new Map();
  for (const p of projects) {
    if (!projectsByOwner.has(p.owner_id)) {
      projectsByOwner.set(p.owner_id, []);
    }
    projectsByOwner.get(p.owner_id).push(p);
  }

  const containerService = require("./container.service");

  // For all running projects, fetch telemetry in parallel
  const runningProjects = projects.filter(
    (p) => (p.status || "").toLowerCase() === "running",
  );

  const telemetryByProject = new Map();
  await Promise.all(
    runningProjects.map(async (p) => {
      try {
        const tel = await containerService.getContainerTelemetry(p.id);
        if (tel && tel.running) {
          telemetryByProject.set(p.id, tel);
        }
      } catch {
        // Silently catch container lookup issues
      }
    }),
  );

  let totalAllocatedRamMb = 0;
  let totalRunningContainers = 0;

  const userUsageList = users.map((u) => {
    const userProjects = projectsByOwner.get(u.id) || [];
    const userRunningProjects = userProjects.filter(
      (p) => (p.status || "").toLowerCase() === "running",
    );

    let userRamBytes = 0;
    let userCpuSum = 0;
    const containers = [];

    for (const p of userRunningProjects) {
      const tel = telemetryByProject.get(p.id);
      if (tel) {
        userRamBytes += tel.memoryUsed || 0;
        userCpuSum += tel.cpuPercent || 0;
        containers.push({
          projectId: p.id,
          name: p.name,
          memoryUsedBytes: tel.memoryUsed || 0,
          memoryUsedMb:
            Math.round(((tel.memoryUsed || 0) / (1024 * 1024)) * 10) / 10,
          cpuPercent: tel.cpuPercent || 0,
        });
      }
    }

    const usedRamMb = Math.round((userRamBytes / (1024 * 1024)) * 10) / 10;
    const ramLimitMb = u.is_owner ? null : Number(u.ram_limit_mb);
    const maxActiveProjects = u.is_owner ? null : Number(u.max_active_projects);
    const maxProjects = u.is_owner ? null : Number(u.max_projects);

    const ramPercentage =
      ramLimitMb && ramLimitMb > 0
        ? Math.min(100, Math.round((usedRamMb / ramLimitMb) * 100))
        : 0;

    const activeCount = userRunningProjects.length;
    const activePercentage =
      maxActiveProjects && maxActiveProjects > 0
        ? Math.min(100, Math.round((activeCount / maxActiveProjects) * 100))
        : 0;

    const avgCpuPercent =
      activeCount > 0 ? Math.round((userCpuSum / activeCount) * 10) / 10 : 0;

    totalAllocatedRamMb += usedRamMb;
    totalRunningContainers += activeCount;

    return {
      userId: u.id,
      username: u.username,
      email: u.email,
      isOwner: u.is_owner,
      disabled: u.disabled,
      limits: {
        ramLimitMb,
        maxActiveProjects,
        maxProjects,
        quotaBytes: Number(u.quota_bytes),
      },
      usage: {
        totalProjects: userProjects.length,
        activeProjects: activeCount,
        activePercentage,
        usedRamMb,
        ramPercentage,
        cpuPercent: avgCpuPercent,
        usedStorageBytes: Number(u.used_bytes),
      },
      containers,
    };
  });

  const hostTotalRamMb = Math.round(os.totalmem() / (1024 * 1024));
  const hostFreeRamMb = Math.round(os.freemem() / (1024 * 1024));
  const hostUsedRamMb = hostTotalRamMb - hostFreeRamMb;
  const hostRamUsagePercent = Math.round(
    (hostUsedRamMb / hostTotalRamMb) * 100,
  );

  return {
    system: {
      hostTotalRamMb,
      hostFreeRamMb,
      hostUsedRamMb,
      hostRamUsagePercent,
      totalUsers: users.length,
      totalRunningContainers,
      totalAllocatedRamMb: Math.round(totalAllocatedRamMb * 10) / 10,
    },
    users: userUsageList,
  };
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
  updateUserLimits,
  getUsersResourceUsage,
};
