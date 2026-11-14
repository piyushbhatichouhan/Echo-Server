const { pool } = require("../config/database");
const { generateCertificate } = require("./ssl/cert.generator");
const axios = require("axios");

/**
 * Provisions or renews an SSL/TLS certificate for the given hostname.
 */
const provisionCertificate = async (hostname) => {
  if (!hostname) throw new Error("Hostname is required to provision SSL certificate.");
  const safeHostname = String(hostname).trim().toLowerCase();

  // 1. Check if an active certificate already exists with > 30 days validity
  const { rows: existing } = await pool.query(
    `
    SELECT *
    FROM domain_certificates
    WHERE LOWER(hostname) = $1
    LIMIT 1
    `,
    [safeHostname],
  );

  if (existing.length > 0) {
    const cert = existing[0];
    const expiry = new Date(cert.expires_at);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    if (expiry > thirtyDaysFromNow) {
      console.log(`[SSL] Certificate for ${safeHostname} is already active and valid until ${expiry.toISOString()}`);
      return {
        id: cert.id,
        hostname: cert.hostname,
        issuer: cert.issuer,
        expires_at: cert.expires_at,
        ssl_status: "active",
      };
    }
  }

  console.log(`[SSL] Generating new automated zero-config certificate for ${safeHostname}...`);

  // 2. Generate new X.509 RSA-2048 certificate with SAN extensions
  const { certificate, privateKey, expiresAt } = generateCertificate(safeHostname, 90);

  // 3. Upsert into domain_certificates
  const { rows: saved } = await pool.query(
    `
    INSERT INTO domain_certificates
      (hostname, certificate, private_key, issuer, expires_at, created_at, updated_at)
    VALUES
      ($1, $2, $3, 'echo-acme-tls', $4, NOW(), NOW())
    ON CONFLICT (hostname) DO UPDATE
      SET certificate = EXCLUDED.certificate,
          private_key = EXCLUDED.private_key,
          issuer = EXCLUDED.issuer,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
    RETURNING id, hostname, issuer, expires_at, created_at, updated_at
    `,
    [safeHostname, certificate, privateKey, expiresAt],
  );

  // 4. Update project_domains ssl_status to 'active'
  try {
    await pool.query(
      `
      UPDATE project_domains
      SET ssl_status = 'active', updated_at = NOW()
      WHERE LOWER(hostname) = $1
      `,
      [safeHostname],
    );
  } catch (err) {
    console.warn(`[SSL] Warning updating ssl_status for ${safeHostname}:`, err.message);
  }

  // 5. Invalidate edge router cache if router is reachable
  const routerPort = process.env.ROUTER_PORT || 8080;
  axios
    .post(`http://127.0.0.1:${routerPort}/_cache/invalidate`, { hostname: safeHostname }, { timeout: 1500 })
    .catch(() => {});

  console.log(`[SSL] Successfully issued SSL/TLS certificate for ${safeHostname} (Expires: ${expiresAt.toISOString()})`);

  return {
    ...saved[0],
    ssl_status: "active",
  };
};

/**
 * Retrieves certificate metadata for a hostname.
 */
const getCertificate = async (hostname) => {
  if (!hostname) return null;
  const safeHostname = String(hostname).trim().toLowerCase();

  const { rows } = await pool.query(
    `
    SELECT id, hostname, issuer, expires_at, created_at, updated_at
    FROM domain_certificates
    WHERE LOWER(hostname) = $1
    LIMIT 1
    `,
    [safeHostname],
  );

  return rows[0] || null;
};

/**
 * Deletes certificate when domain is removed.
 */
const deleteCertificate = async (hostname) => {
  if (!hostname) return;
  const safeHostname = String(hostname).trim().toLowerCase();

  await pool.query(
    `
    DELETE FROM domain_certificates
    WHERE LOWER(hostname) = $1
    `,
    [safeHostname],
  );
};

/**
 * ACME Challenge Management Helpers
 */
const createAcmeChallenge = async (token, keyAuthorization, hostname) => {
  await pool.query(
    `
    INSERT INTO acme_challenges (token, key_authorization, hostname)
    VALUES ($1, $2, $3)
    ON CONFLICT (token) DO UPDATE
      SET key_authorization = EXCLUDED.key_authorization,
          hostname = EXCLUDED.hostname,
          created_at = NOW()
    `,
    [token, keyAuthorization, String(hostname).toLowerCase()],
  );
};

const cleanupAcmeChallenges = async (hostname) => {
  await pool.query(
    `DELETE FROM acme_challenges WHERE LOWER(hostname) = $1`,
    [String(hostname).toLowerCase()],
  );
};

module.exports = {
  provisionCertificate,
  getCertificate,
  deleteCertificate,
  createAcmeChallenge,
  cleanupAcmeChallenges,
};

