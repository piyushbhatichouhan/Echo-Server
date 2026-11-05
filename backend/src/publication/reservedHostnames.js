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
      error: `"${normalized}" is reserved..`,
      reason: "SYSTEM_RESERVED",
    };
  }

  // 2. Superadmin Reserved: Blocked for non-owners, allowed for owner
  if (SUPERADMIN_RESERVED.has(normalized)) {
    if (!isOwner) {
      return {
        valid: false,
        error: `"${normalized}" is reserved.`,
        reason: "SUPERADMIN_RESERVED",
      };
    }
  }

  return { valid: true };
}

module.exports = {
  SYSTEM_RESERVED,
  SUPERADMIN_RESERVED,
  validateSubdomainReservation,

  // Backward compatibility for existing code using Set.has()
  has: (name) => {
    const norm = (name || "").toLowerCase().trim();
    return SYSTEM_RESERVED.has(norm) || SUPERADMIN_RESERVED.has(norm);
  },
};
