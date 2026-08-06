const client = require("./npm/client");

const getHostByHostname = async (hostname) => {
  const response = await client.request({
    method: "GET",
    url: "/api/nginx/proxy-hosts",
  });

  return response.data.find((h) => h.domain_names.includes(hostname));
};

const updateHost = async ({ id, hostname, port }) => {
  const forwardHost =
    process.env.NPM_FORWARD_MODE === "docker"
      ? `echohub-${projectId}`
      : process.env.NPM_FORWARD_HOST;

  const response = await client.request({
    method: "PUT",
    url: `/api/nginx/proxy-hosts/${id}`,
    data: {
      domain_names: [hostname],

      forward_scheme: "http",
      forward_host: forwardHost,
      forward_port: port,

      access_list_id: 0,
      certificate_id: 0,

      ssl_forced: false,
      caching_enabled: false,
      block_exploits: true,
      http2_support: true,
      hsts_enabled: false,

      allow_websocket_upgrade: true,
      advanced_config: "",
      locations: [],

      meta: {
        letsencrypt_agree: false,
        dns_challenge: false,
      },
    },
  });

  return response.data;
};

const publishHost = async ({ projectId, hostname, port }) => {
  const existing = await getHostByHostname(hostname);

  if (existing) {
    console.log(`[NPM] Updating existing proxy host: ${hostname}`);

    return updateHost({
      id: existing.id,
      hostname,
      port,
    });
  }

  console.log(`[NPM] Creating proxy host: ${hostname}`);

  const forwardHost =
    process.env.NPM_FORWARD_MODE === "docker"
      ? `echohub-${projectId}`
      : process.env.NPM_FORWARD_HOST;

  const response = await client.request({
    method: "POST",
    url: "/api/nginx/proxy-hosts",
    data: {
      domain_names: [hostname],

      forward_scheme: "http",
      forward_host: forwardHost,
      forward_port: port,

      access_list_id: 0,
      certificate_id: 0,

      ssl_forced: false,
      caching_enabled: false,
      block_exploits: true,
      http2_support: true,
      hsts_enabled: false,

      allow_websocket_upgrade: true,
      advanced_config: "",
      locations: [],

      meta: {
        letsencrypt_agree: false,
        dns_challenge: false,
      },
    },
  });

  return response.data;
};

const removeHost = async ({ hostname }) => {
  const response = await client.request({
    method: "GET",
    url: "/api/nginx/proxy-hosts",
  });

  const hosts = response.data;

  const host = hosts.find((h) => h.domain_names.includes(hostname));

  if (!host) {
    return;
  }

  await client.request({
    method: "DELETE",
    url: `/api/nginx/proxy-hosts/${host.id}`,
  });
};

module.exports = {
  publishHost,
  removeHost,
  getHostByHostname,
  updateHost,
};
