const repository = require("./router.repository");

// In-Memory Hostname Routing Cache
const routeCache = new Map();

const POSITIVE_TTL_MS = Number(process.env.ROUTER_CACHE_TTL_MS) || 10000; // 10 seconds
const NEGATIVE_TTL_MS = 3000; // 3 seconds for non-existent domains

let cacheHits = 0;
let cacheMisses = 0;

// Periodic cleanup of expired cache items to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of routeCache.entries()) {
    if (item.expiresAt <= now) {
      routeCache.delete(key);
    }
  }
}, 60000).unref();

const resolveHostname = async (hostname, { bypassCache = false } = {}) => {
  if (!hostname) return null;
  const key = String(hostname).trim().toLowerCase();

  const now = Date.now();

  if (!bypassCache) {
    const cached = routeCache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits++;
      return cached.data;
    }
  }

  cacheMisses++;
  const row = await repository.getProjectByHostname(key);

  if (!row) {
    // Negative caching to shield DB from DDoS / random subdomain scans
    routeCache.set(key, {
      data: null,
      expiresAt: now + NEGATIVE_TTL_MS,
    });
    return null;
  }

  const result = {
    hostname: row.hostname,
    publication: {
      status: row.publication_status,
      sslStatus: row.ssl_status,
      verificationStatus: row.verification_status,
    },
    project: {
      id: row.project_id,
      name: row.name,
      userId: row.user_id,
      applicationType: row.application_type,
    },
    deployment: {
      id: row.deployment_id,
      containerName: row.container_name,
      containerPort: row.container_port,
      port: row.port,
      status: row.deployment_status,
    },
  };

  routeCache.set(key, {
    data: result,
    expiresAt: now + POSITIVE_TTL_MS,
  });

  return result;
};

const invalidateHostname = (hostname) => {
  if (!hostname) return;
  routeCache.delete(String(hostname).trim().toLowerCase());
};

const clearCache = () => {
  routeCache.clear();
};

const getCacheStats = () => {
  return {
    size: routeCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRatio:
      cacheHits + cacheMisses > 0
        ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1) + "%"
        : "0%",
  };
};

module.exports = {
  resolveHostname,
  invalidateHostname,
  clearCache,
  getCacheStats,
};
