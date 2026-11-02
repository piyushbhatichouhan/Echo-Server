const net = require("net");
const { pool } = require("../config/database");

const START_PORT = 3001;
const MAX_PORT = 3999;

const isPortAvailableOnHost = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, "0.0.0.0");
  });
};

const getDockerMappedPorts = async () => {
  try {
    const docker = require("../docker/docker.client");
    const containers = await docker.listContainers({ all: true });
    const ports = new Set();
    for (const c of containers) {
      if (Array.isArray(c.Ports)) {
        for (const p of c.Ports) {
          if (p.PublicPort) {
            ports.add(Number(p.PublicPort));
          }
        }
      }
    }
    return ports;
  } catch (err) {
    return new Set();
  }
};

const cleanupPseudoPorts = async () => {
  try {
    // 1. Release ports from deployments that are not running or belong to deleted projects
    const res = await pool.query(`
      UPDATE deployments
      SET port = NULL
      WHERE port IS NOT NULL
        AND (
          status != 'running'
          OR project_id NOT IN (SELECT id FROM projects)
        )
      RETURNING id, port
    `);

    // 2. In case a project has multiple 'running' deployments, keep only the latest one
    await pool.query(`
      WITH duplicate_running AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) as rn
        FROM deployments
        WHERE status = 'running' AND port IS NOT NULL
      )
      UPDATE deployments
      SET status = 'stopped', port = NULL
      WHERE id IN (
        SELECT id FROM duplicate_running WHERE rn > 1
      )
    `);

    if (res.rowCount > 0) {
      console.log(`[PortService] Cleaned up ${res.rowCount} pseudo-allocated deployment ports.`);
    }
    return res.rowCount;
  } catch (err) {
    console.error("[PortService] Error during cleanupPseudoPorts:", err.message);
    return 0;
  }
};

const getAvailablePort = async (forProjectId = null) => {
  // Always clean up non-running pseudo ports first
  await cleanupPseudoPorts();

  // If this project is already running on a port, reuse it
  if (forProjectId) {
    const existing = await pool.query(
      `
      SELECT port
      FROM deployments
      WHERE project_id = $1
        AND port IS NOT NULL
        AND status = 'running'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [forProjectId],
    );

    const existingPort = existing.rows[0]?.port;
    if (existingPort) {
      return Number(existingPort);
    }
  }

  // Get all ports currently used by running deployments in database
  const result = await pool.query(`
    SELECT port
    FROM deployments
    WHERE port IS NOT NULL
      AND status = 'running'
    ORDER BY port
  `);

  const dbUsed = new Set(result.rows.map((r) => Number(r.port)));
  const dockerUsed = await getDockerMappedPorts();

  let port = START_PORT;

  while (port <= MAX_PORT) {
    // 1. Must not be in DB 'running' deployments
    if (dbUsed.has(port)) {
      port++;
      continue;
    }

    // 2. Must not be mapped by any Docker container
    if (dockerUsed.has(port)) {
      port++;
      continue;
    }

    // 3. Must be physically free to bind on 0.0.0.0 on the host
    const freeOnHost = await isPortAvailableOnHost(port);
    if (!freeOnHost) {
      port++;
      continue;
    }

    // Verified available port
    return port;
  }

  throw new Error(`No available host ports in range ${START_PORT}-${MAX_PORT}.`);
};

module.exports = {
  getAvailablePort,
  cleanupPseudoPorts,
  isPortAvailableOnHost,
};
