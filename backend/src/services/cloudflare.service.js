const axios = require("axios");

const getApiConfig = () => {
  const token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  const zoneId = (process.env.CLOUDFLARE_ZONE_ID || "").trim();
  return {
    token,
    zoneId,
    isConfigured: Boolean(token && zoneId),
  };
};

/**
 * Register a custom hostname in Cloudflare for SaaS.
 * Allows external domains (e.g. dev.jks.codes) to CNAME to your domain
 * and route through Cloudflare Tunnel with automated SSL.
 */
const registerCustomHostname = async (hostname) => {
  const { token, zoneId, isConfigured } = getApiConfig();
  if (!isConfigured || !hostname) {
    return {
      configured: false,
      message: "Cloudflare API token or Zone ID not configured.",
    };
  }

  const cleanHost = String(hostname).trim().toLowerCase();

  try {
    const res = await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
      {
        hostname: cleanHost,
        ssl: {
          method: "http",
          type: "dv",
          settings: {
            http2: "on",
            min_tls_version: "1.2",
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      },
    );

    console.log(`[Cloudflare SaaS] Registered custom hostname for ${cleanHost}`);
    return {
      configured: true,
      success: true,
      data: res.data?.result,
    };
  } catch (err) {
    const errorDetails = err.response?.data?.errors?.[0];
    // Error 1406: Custom hostname already exists in zone
    if (errorDetails?.code === 1406) {
      console.log(`[Cloudflare SaaS] Hostname ${cleanHost} already registered in zone.`);
      return { configured: true, success: true, message: "Hostname already registered." };
    }

    console.warn(`[Cloudflare SaaS] Registration notice for ${cleanHost}:`, errorDetails?.message || err.message);
    return {
      configured: true,
      success: false,
      error: errorDetails?.message || err.message,
    };
  }
};

/**
 * Remove a custom hostname from Cloudflare for SaaS.
 */
const deleteCustomHostname = async (hostname) => {
  const { token, zoneId, isConfigured } = getApiConfig();
  if (!isConfigured || !hostname) return false;

  const cleanHost = String(hostname).trim().toLowerCase();

  try {
    // 1. Search for hostname to find its custom_hostname ID
    const searchRes = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames?hostname=${cleanHost}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      },
    );

    const match = searchRes.data?.result?.[0];
    if (!match?.id) {
      return false;
    }

    // 2. Delete the custom hostname
    await axios.delete(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${match.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      },
    );

    console.log(`[Cloudflare SaaS] Deleted custom hostname for ${cleanHost}`);
    return true;
  } catch (err) {
    console.warn(`[Cloudflare SaaS] Delete notice for ${cleanHost}:`, err.message);
    return false;
  }
};

module.exports = {
  getApiConfig,
  registerCustomHostname,
  deleteCustomHostname,
};

