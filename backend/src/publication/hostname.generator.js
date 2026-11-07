const publicationRepository = require("./publication.repository");
const { validateSubdomainReservation } = require("./reservedHostnames");

const BASE_DOMAIN = process.env.DEFAULT_DOMAIN || "devpiyush.in";
const MAX_HOSTNAME_LENGTH = 63;
const MIN_SUBDOMAIN_LENGTH = 3;

const slugify = (text) => {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Validates a user-chosen custom subdomain.
 * @param {string} rawSubdomain - The requested prefix (e.g. "portfolio")
 * @param {boolean} isOwner - Whether the user is the Super Admin
 * @param {string|number|null} excludeProjectId - Optional project ID to exclude when checking collisions
 * @returns {Promise<{ valid: boolean, subdomain?: string, hostname?: string, message?: string, reason?: string, isCurrent?: boolean }>}
 */
const validateCustomSubdomain = async (rawSubdomain, isOwner = false, excludeProjectId = null) => {
  if (!rawSubdomain || typeof rawSubdomain !== "string") {
    return {
      valid: false,
      message: "Subdomain cannot be empty.",
      reason: "EMPTY",
    };
  }

  const clean = rawSubdomain.toLowerCase().trim();

  // 1. Length check
  if (clean.length < MIN_SUBDOMAIN_LENGTH) {
    return {
      valid: false,
      message: `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters.`,
      reason: "TOO_SHORT",
    };
  }

  if (clean.length > MAX_HOSTNAME_LENGTH) {
    return {
      valid: false,
      message: `Subdomain cannot exceed ${MAX_HOSTNAME_LENGTH} characters.`,
      reason: "TOO_LONG",
    };
  }

  // 2. Format check (lowercase letters, digits, single hyphens, cannot start or end with hyphen)
  if (!SUBDOMAIN_REGEX.test(clean) || clean.includes("--")) {
    return {
      valid: false,
      message: "Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start, end, or contain double hyphens).",
      reason: "INVALID_FORMAT",
    };
  }

  // 3. Reservation check (System Reserved vs Super Admin Reserved)
  const reservationCheck = validateSubdomainReservation(clean, isOwner);
  if (!reservationCheck.valid) {
    return {
      valid: false,
      message: reservationCheck.error,
      reason: reservationCheck.reason,
    };
  }

  // 4. Collision check against database
  const fullHostname = `${clean}.${BASE_DOMAIN}`;
  const existing = await publicationRepository.getDomainByHostname(fullHostname);
  if (existing) {
    if (excludeProjectId && String(existing.project_id) === String(excludeProjectId)) {
      return {
        valid: true,
        subdomain: clean,
        hostname: fullHostname,
        isCurrent: true,
        message: "Currently active subdomain for this project.",
      };
    }
    return {
      valid: false,
      message: `The subdomain "${clean}.${BASE_DOMAIN}" is not available.`,
      reason: "ALREADY_EXISTS",
    };
  }

  // 5. Collision check against active or pending subdomain requests
  const existingReq = await publicationRepository.getPendingOrApprovedRequestBySubdomain(
    clean,
    excludeProjectId,
  );
  if (existingReq) {
    if (excludeProjectId && String(existingReq.project_id) === String(excludeProjectId)) {
      return {
        valid: true,
        subdomain: clean,
        hostname: fullHostname,
        isCurrent: true,
        message:
          existingReq.status === "approved"
            ? "Approved custom subdomain for this project."
            : "Subdomain request pending approval for this project.",
      };
    }
    return {
      valid: false,
      message: `The subdomain "${clean}.${BASE_DOMAIN}" is currently reserved or requested by another project.`,
      reason: "ALREADY_REQUESTED",
    };
  }

  return {
    valid: true,
    subdomain: clean,
    hostname: fullHostname,
  };
};

/**
 * Generates default hostname: username-project.devpiyush.in
 */
const generateHostname = async (username, projectName) => {
  const base = `${slugify(username)}-${slugify(projectName)}`;

  let hostname = base;
  let counter = 2;
  if (hostname.length > MAX_HOSTNAME_LENGTH) {
    hostname = hostname.slice(0, MAX_HOSTNAME_LENGTH).replace(/-+$/, "");
  }

  while (true) {
    const fullHostname = `${hostname}.${BASE_DOMAIN}`;
    const existing = await publicationRepository.getDomainByHostname(fullHostname);

    if (!existing) {
      return fullHostname;
    }

    hostname = `${base}-${counter}`;
    counter++;
  }
};

module.exports = {
  slugify,
  generateHostname,
  validateCustomSubdomain,
  BASE_DOMAIN,
};
