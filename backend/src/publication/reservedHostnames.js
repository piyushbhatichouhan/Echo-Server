/**
 * Reserved Hostnames Classification
 * - SYSTEM_RESERVED: Core system routing, infrastructure, and protocol endpoints. Blocked for everyone.
 * - SUPERADMIN_RESERVED: Flagship handles and personal namespaces reserved exclusively for the Super Admin / Owner.
 */

// 1. Core infrastructure & routing endpoints (blocked for all projects)
const SYSTEM_RESERVED = new Set([
  // Core API & Auth
  "api",
  "auth",
  "login",
  "logout",
  "signup",
  "register",
  "oauth",
  "token",
  "session",

  // Echo Platform Services
  "echo",
  "echoserver",
  "echohub",
  "dashboard",
  "admin",
  "server",
  "cloud",
  "storage",
  "drive",
  "files",
  "workspace",
  "publication",
  "deploy",
  "deployment",
  "project",
  "projects",
  "user",
  "users",

  // Infrastructure & Proxy
  "proxy",
  "tunnel",
  "nginx",
  "npm",
  "docker",
  "portainer",
  "postgres",
  "pg",
  "db",
  "database",
  "redis",
  "traefik",
  "caddy",
  "internal",
  "system",
  "gateway",

  // Common DNS & Protocols
  "www",
  "mail",
  "email",
  "smtp",
  "pop",
  "imap",
  "ftp",
  "sftp",
  "ssh",
  "ns",
  "ns1",
  "ns2",
  "dns",
  "cdn",
  "static",
  "assets",
  "media",

  // Observability & Operations
  "metrics",
  "logs",
  "health",
  "ping",
  "status",
  "monitor",
  "telemetry",
  "grafana",
  "prometheus",
  "socket",
  "ws",

  // Support & Meta
  "support",
  "docs",
  "documentation",
  "help",
  "legal",
  "terms",
  "privacy",
  "billing",
  "pay",
  "payment",
  "webhook",
  "webhooks",
  "test",
  "staging",
]);

// 2. Reserved exclusively for the Super Admin / Platform Owner (Only is_owner = true can claim)
const SUPERADMIN_RESERVED = new Set([
  // Owner Personal Names & Handles
  "piyush",
  "piyushbhati",
  "piyushbhatichouhan",
  "pbc",
  "piyushshende",
  "zinko",
  "zinkopiyush",
  "echopiyush",
  "chouhan",
"palak",
"palakmishra",
  // Flagship & Identity Namespaces
  "me",
  "root",
  "owner",
  "superadmin",
  "portfolio",
  "personal",
  "blog",
  "home",
  "dev",
  "official",
  "main",
  "hub",
  "core",
  "master",

  // Hardware & Node Namespaces
  "pi",
  "raspberry",
  "raspberrypi",
  "node",
  "server1",
  "control",
  "echoserver",
]);

// 3. Generic vocabulary and nouns restricted from standard user registration
// (Prevents users from taking handles like "home" or "cloud" to game compound domains)
const RESERVED_USERNAMES = new Set([
  // Core infrastructure & platform handles
  "admin",
  "administrator",
  "root",
  "superuser",
  "superadmin",
  "owner",
  "echoserver",
  "echohub",
  "system",
  "support",
  "official",
  "help",
  "security",
  "staff",
  "team",

  // Generic vocabulary commonly abused as vanity prefixes
  "home",
  "cloud",
  "api",
  "app",
  "apps",
  "dev",
  "developer",
  "web",
  "ai",
  "smart",
  "shop",
  "store",
  "net",
  "network",
  "bot",
  "tech",
  "pro",
  "top",
  "best",
  "open",
  "free",
  "fast",
  "secure",
  "live",
  "code",
  "host",
  "hosting",
  "node",
  "data",
  "hub",
  "mail",
  "auth",
  "login",
  "portal",
  "io",
  "iot",
  "dns",
  "link",
  "online",
  "auto",
  "service",
  "services",
  "server",
  "servers",
  "site",
  "sites",
  "global",
  "public",
  "status",
  "test",
  "beta",
  "alpha",
  "core",
  "master",
  "main",
  "base",
]);

// 4. Protected compound vanity slugs
// (Prevents someone from synthesizing high-value product names without Custom Domain Privilege)
const PROTECTED_VANITY_SLUGS = new Set([
  // Smart Home & IoT
  "home-automation",
  "smart-home",
  "home-assistant",
  "smart-device",
  "iot-dashboard",
  "iot-server",
  "home-lab",
  "homelab",

  // Cloud & Hosting
  "cloud-storage",
  "cloud-server",
  "cloud-drive",
  "cloud-service",
  "cloud-app",
  "cloud-native",
  "cloud-hub",

  // Dev & APIs
  "api-gateway",
  "api-service",
  "web-app",
  "web-service",
  "dev-tools",
  "dev-portal",
  "developer-portal",
  "code-editor",
  "open-source",
  "fast-api",
  "rest-api",
  "graphql-api",

  // AI & Data
  "ai-assistant",
  "ai-chat",
  "chat-bot",
  "bot-service",
  "data-science",
  "machine-learning",
  "deep-learning",
  "artificial-intelligence",

  // Business & Media
  "e-commerce",
  "online-store",
  "tech-support",
  "status-page",
  "customer-portal",
  "secure-login",
  "auth-service",
  "database-server",
  "dns-server",
  "proxy-server",
  "control-panel",
  "live-stream",
  "media-server",
  "next-gen",
  "app-store",
]);

/**
 * Validates whether a requested subdomain can be claimed by a given user.
 * @param {string} subdomain - Subdomain prefix (e.g. "portfolio")
 * @param {boolean} isOwner - Whether the requesting user is the superadmin/owner
 * @returns {{ valid: boolean, error?: string, reason?: string }}
 */
function validateSubdomainReservation(subdomain, isOwner = false) {
  const normalized = (subdomain || "").toLowerCase().trim();

  // 1. System Reserved: Blocked for all
  if (SYSTEM_RESERVED.has(normalized)) {
    return {
      valid: false,
      error: `"${normalized}" is reserved for system infrastructure.`,
      reason: "SYSTEM_RESERVED",
    };
  }

  // 2. Superadmin Reserved: Blocked for non-owners, allowed for owner
  if (SUPERADMIN_RESERVED.has(normalized)) {
    if (!isOwner) {
      return {
        valid: false,
        error: `"${normalized}" is reserved for the Super Admin.`,
        reason: "SUPERADMIN_RESERVED",
      };
    }
  }

  return { valid: true };
}

/**
 * Validates whether a username can be registered or updated to.
 * Protects generic nouns and platform services from being claimed by regular accounts.
 * @param {string} username - Requested username
 * @param {boolean} isOwner - Whether the requesting user is the Super Admin / Owner
 * @returns {{ valid: boolean, error?: string, reason?: string }}
 */
function validateUsernameReservation(username, isOwner = false) {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required." };
  }
  const norm = username.toLowerCase().trim();

  if (isOwner) {
    return { valid: true };
  }

  if (SYSTEM_RESERVED.has(norm)) {
    return {
      valid: false,
      error: `Username "${norm}" is reserved for system infrastructure.`,
      reason: "SYSTEM_RESERVED",
    };
  }

  if (SUPERADMIN_RESERVED.has(norm) || RESERVED_USERNAMES.has(norm)) {
    return {
      valid: false,
      error: `Username "${norm}" is a reserved platform handle. Please choose a personal username.`,
      reason: "RESERVED_USERNAME",
    };
  }

  return { valid: true };
}

/**
 * Validates whether a default synthesized domain (username-project) is permissible,
 * ensuring users do not bypass custom domain privileges to claim high-value vanity phrases.
 * @param {string} baseSlug - The synthesized slug (e.g. "home-automation")
 * @param {string} username - The username part
 * @param {boolean} isOwner - Whether the user is the Super Admin
 * @param {boolean} canCustomSubdomain - Whether the user holds Custom Domain Privilege
 * @returns {{ valid: boolean, error?: string, reason?: string }}
 */
function validateDefaultSubdomainReservation(
  baseSlug,
  username = "",
  isOwner = false,
  canCustomSubdomain = false,
) {
  const normBase = (baseSlug || "").toLowerCase().trim();
  const normUsername = (username || "").toLowerCase().trim();

  // Super Admin is fully exempt
  if (isOwner) {
    return { valid: true };
  }

  // 1. Direct match with system reserved routing
  if (SYSTEM_RESERVED.has(normBase)) {
    return {
      valid: false,
      error: `The default domain "${normBase}" is reserved for system infrastructure.`,
      reason: "SYSTEM_RESERVED",
    };
  }

  // 2. Direct match with superadmin reserved
  if (SUPERADMIN_RESERVED.has(normBase)) {
    return {
      valid: false,
      error: `The default domain "${normBase}" is reserved exclusively for the Super Admin.`,
      reason: "SUPERADMIN_RESERVED",
    };
  }

  // 3. Known compound vanity handles require Custom Domain Privilege
  if (PROTECTED_VANITY_SLUGS.has(normBase)) {
    if (!canCustomSubdomain) {
      return {
        valid: false,
        error: `The domain "${normBase}" is classified as a premium vanity handle. Custom Domain Privilege is required to claim this domain.`,
        reason: "VANITY_RESERVED",
      };
    }
  }

  // 4. If the username used to synthesize the domain is a reserved generic word
  // (Prevents an existing account named 'home' or 'cloud' from publishing 'home-automation')
  if (
    RESERVED_USERNAMES.has(normUsername) ||
    SUPERADMIN_RESERVED.has(normUsername)
  ) {
    if (!canCustomSubdomain) {
      return {
        valid: false,
        error: `Domains formed with reserved prefix "${normUsername}" require Custom Domain Privilege.`,
        reason: "RESERVED_PREFIX_EXPLOIT",
      };
    }
  }

  return { valid: true };
}

module.exports = {
  SYSTEM_RESERVED,
  SUPERADMIN_RESERVED,
  RESERVED_USERNAMES,
  PROTECTED_VANITY_SLUGS,
  validateSubdomainReservation,
  validateUsernameReservation,
  validateDefaultSubdomainReservation,

  // Backward compatibility for existing code using Set.has()
  has: (name) => {
    const norm = (name || "").toLowerCase().trim();
    return (
      SYSTEM_RESERVED.has(norm) ||
      SUPERADMIN_RESERVED.has(norm) ||
      RESERVED_USERNAMES.has(norm)
    );
  },
};
