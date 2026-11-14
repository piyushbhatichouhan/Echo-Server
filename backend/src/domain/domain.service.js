const domainRepository = require("./domain.repository");
const { pool } = require("../config/database");
const projectRepository = require("../repositories/project.repository");
const userRepository = require("../repositories/user.repository");
const sslService = require("../services/ssl.service");
const { buildHostname } = require("./hostname.generator");
const RESERVED = require("./reserved.hostnames");

const assign = async (projectId) => {
  // 1. Load project
  const project = await projectRepository.getById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Load owner
  const owner = await userRepository.getById(project.owner_id);

  if (!owner) {
    throw new Error("Owner not found");
  }

  // 3. Generate base hostname
  let hostname = buildHostname(owner.username, project.name);

  let base = hostname.replace(".devpiyush.in", "");

  // 4. Reserved names
  if (RESERVED.includes(base)) {
    throw new Error("Reserved hostname");
  }

  // 5. Find available hostname
  let candidate = hostname;

  let counter = 2;

  while (await domainRepository.hostnameExists(candidate)) {
    candidate = `${base}-${counter}.devpiyush.in`;
    counter++;
  }

  // 6. Save
  return await domainRepository.create({
    project_id: project.id,
    hostname: candidate,
  });
};

const getDomains = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT 
      pd.*,
      dc.issuer AS cert_issuer,
      dc.expires_at AS cert_expires_at
    FROM project_domains pd
    LEFT JOIN domain_certificates dc 
      ON LOWER(dc.hostname) = LOWER(pd.hostname)
    WHERE pd.project_id = $1
    ORDER BY pd.is_primary DESC, pd.created_at ASC
    `,
    [projectId],
  );
  return rows;
};

const cleanHostname = (raw) => {
  if (!raw) return "";
  let host = String(raw).trim().toLowerCase();
  host = host.replace(/^https?:\/\//i, "");
  host = host.split("/")[0].split(":")[0];
  return host;
};

const addCustomDomain = async (projectId, rawHostname) => {
  const hostname = cleanHostname(rawHostname);

  if (!hostname) {
    const error = new Error("Custom domain hostname is required.");
    error.status = 400;
    error.isUserError = true;
    throw error;
  }

  // Validate format (e.g. app.example.com or example.com)
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(hostname)) {
    const error = new Error(
      "Invalid domain format. Please enter a valid domain (e.g. app.yourdomain.com or yourdomain.com).",
    );
    error.status = 400;
    error.isUserError = true;
    throw error;
  }

  if (hostname.endsWith(".devpiyush.in")) {
    const error = new Error(
      "Direct .devpiyush.in domains must be configured through Project Publication.",
    );
    error.status = 400;
    error.isUserError = true;
    throw error;
  }

  const exists = await domainRepository.hostnameExists(hostname);
  if (exists) {
    const error = new Error(`Domain '${hostname}' is already attached to an EchoServer service.`);
    error.status = 409;
    error.isUserError = true;
    throw error;
  }

  // Create project domain
  const { rows } = await pool.query(
    `
    INSERT INTO project_domains (
      project_id,
      hostname,
      custom_domain,
      is_custom,
      is_primary,
      ssl_status,
      verification_status,
      publication_status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $2, TRUE, FALSE, 'active', 'verified', 'active', NOW(), NOW())
    RETURNING *
    `,
    [projectId, hostname],
  );

  const domain = rows[0];

  // Automated Zero-Config SSL provisioning in background
  try {
    sslService.provisionCertificate(hostname).catch((err) => {
      console.warn(`[SSL] Background provisioning notice for ${hostname}:`, err.message);
    });
  } catch (_) {}

  // Automated Cloudflare for SaaS custom hostname registration (for Cloudflare Tunnel / CGNAT setups)
  try {
    const cloudflareService = require("../services/cloudflare.service");
    cloudflareService.registerCustomHostname(hostname).catch((err) => {
      console.warn(`[Cloudflare] Background registration notice for ${hostname}:`, err.message);
    });
  } catch (_) {}

  return domain;
};

const deleteCustomDomain = async (projectId, domainId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_domains
    WHERE id = $1 AND project_id = $2
    LIMIT 1
    `,
    [domainId, projectId],
  );

  if (rows.length === 0) {
    const error = new Error("Domain not found for this project.");
    error.status = 404;
    error.isUserError = true;
    throw error;
  }

  const domain = rows[0];
  if (!domain.is_custom) {
    const error = new Error("Cannot delete the primary platform domain. Unpublish the project instead.");
    error.status = 400;
    error.isUserError = true;
    throw error;
  }

  await pool.query(`DELETE FROM project_domains WHERE id = $1`, [domainId]);

  // Clean up certificates
  try {
    await sslService.deleteCertificate(domain.hostname);
  } catch (_) {}

  // Clean up Cloudflare custom hostname if configured
  try {
    const cloudflareService = require("../services/cloudflare.service");
    cloudflareService.deleteCustomHostname(domain.hostname).catch((err) => {
      console.warn(`[Cloudflare] Background cleanup notice for ${domain.hostname}:`, err.message);
    });
  } catch (_) {}

  return { success: true, message: `Domain '${domain.hostname}' removed.` };
};

const verifyCustomDomain = async (projectId, domainId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_domains
    WHERE id = $1 AND project_id = $2
    LIMIT 1
    `,
    [domainId, projectId],
  );

  if (rows.length === 0) {
    const error = new Error("Domain not found.");
    error.status = 404;
    throw error;
  }

  const domain = rows[0];

  // Re-issue or verify zero-config SSL certificate
  const certInfo = await sslService.provisionCertificate(domain.hostname);

  await pool.query(
    `
    UPDATE project_domains
    SET ssl_status = 'active', verification_status = 'verified', updated_at = NOW()
    WHERE id = $1
    `,
    [domainId],
  );

  return {
    ...domain,
    ssl_status: "active",
    verification_status: "verified",
    cert_issuer: certInfo.issuer,
    cert_expires_at: certInfo.expires_at,
  };
};

module.exports = {
  assign,
  getDomains,
  addCustomDomain,
  deleteCustomDomain,
  verifyCustomDomain,
};
