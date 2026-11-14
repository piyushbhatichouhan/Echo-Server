const crypto = require("crypto");
const { pool } = require("../config/database");
const docker = require("../docker/docker.client");
const portService = require("./port.service");
const projectService = require("./project.service");
const environmentRepository = require("../repositories/environment.repository");

// Supported database engine configurations
const ENGINE_CONFIGS = {
  postgres: {
    title: "PostgreSQL",
    defaultVersion: "17-alpine",
    internalPort: 5432,
    mountPath: "/var/lib/postgresql/data",
    getImage: (ver) => `postgres:${ver || "17-alpine"}`,
    getEnv: ({ dbName, dbUser, dbPassword }) => [
      `POSTGRES_DB=${dbName}`,
      `POSTGRES_USER=${dbUser}`,
      `POSTGRES_PASSWORD=${dbPassword}`,
    ],
    getConnectionString: ({ host, port, dbName, dbUser, dbPassword }) =>
      `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${host}:${port}/${dbName}`,
    getEnvVars: ({ host, port, dbName, dbUser, dbPassword, connectionString }) => ({
      DATABASE_URL: connectionString,
      POSTGRES_HOST: host,
      POSTGRES_PORT: String(port),
      POSTGRES_DB: dbName,
      POSTGRES_USER: dbUser,
      POSTGRES_PASSWORD: dbPassword,
    }),
  },

  redis: {
    title: "Redis",
    defaultVersion: "7-alpine",
    internalPort: 6379,
    mountPath: "/data",
    getImage: (ver) => `redis:${ver || "7-alpine"}`,
    getCmd: ({ dbPassword }) => [
      "redis-server",
      "--requirepass",
      dbPassword,
      "--appendonly",
      "yes",
    ],
    getConnectionString: ({ host, port, dbPassword }) =>
      `redis://:${encodeURIComponent(dbPassword)}@${host}:${port}`,
    getEnvVars: ({ host, port, dbPassword, connectionString }) => ({
      REDIS_URL: connectionString,
      REDIS_HOST: host,
      REDIS_PORT: String(port),
      REDIS_PASSWORD: dbPassword,
    }),
  },

  mysql: {
    title: "MySQL",
    defaultVersion: "8.0",
    internalPort: 3306,
    mountPath: "/var/lib/mysql",
    getImage: (ver) => `mysql:${ver || "8.0"}`,
    getEnv: ({ dbName, dbUser, dbPassword }) => [
      `MYSQL_DATABASE=${dbName}`,
      `MYSQL_USER=${dbUser}`,
      `MYSQL_PASSWORD=${dbPassword}`,
      `MYSQL_ROOT_PASSWORD=${dbPassword}`,
    ],
    getConnectionString: ({ host, port, dbName, dbUser, dbPassword }) =>
      `mysql://${dbUser}:${encodeURIComponent(dbPassword)}@${host}:${port}/${dbName}`,
    getEnvVars: ({ host, port, dbName, dbUser, dbPassword, connectionString }) => ({
      MYSQL_URL: connectionString,
      MYSQL_HOST: host,
      MYSQL_PORT: String(port),
      MYSQL_DATABASE: dbName,
      MYSQL_USER: dbUser,
      MYSQL_PASSWORD: dbPassword,
    }),
  },

  mongo: {
    title: "MongoDB",
    defaultVersion: "7.0",
    internalPort: 27017,
    mountPath: "/data/db",
    getImage: (ver) => `mongo:${ver || "7.0"}`,
    getEnv: ({ dbName, dbUser, dbPassword }) => [
      `MONGO_INITDB_ROOT_USERNAME=${dbUser}`,
      `MONGO_INITDB_ROOT_PASSWORD=${dbPassword}`,
      `MONGO_INITDB_DATABASE=${dbName}`,
    ],
    getConnectionString: ({ host, port, dbName, dbUser, dbPassword }) =>
      `mongodb://${dbUser}:${encodeURIComponent(dbPassword)}@${host}:${port}/${dbName}?authSource=admin`,
    getEnvVars: ({ host, port, dbName, dbUser, dbPassword, connectionString }) => ({
      MONGODB_URI: connectionString,
      MONGO_HOST: host,
      MONGO_PORT: String(port),
      MONGO_USER: dbUser,
      MONGO_PASSWORD: dbPassword,
      MONGO_DATABASE: dbName,
    }),
  },
};

/**
 * Ensures an image is pulled locally before starting.
 */
async function ensureImagePulled(imageName) {
  try {
    await docker.getImage(imageName).inspect();
  } catch (err) {
    console.log(`[ManagedDB] Pulling image ${imageName}...`);
    await new Promise((resolve, reject) => {
      docker.pull(imageName, (pullErr, stream) => {
        if (pullErr) return reject(pullErr);
        docker.modem.followProgress(stream, (onFinishErr) => {
          if (onFinishErr) return reject(onFinishErr);
          resolve();
        });
      });
    });
    console.log(`[ManagedDB] Successfully pulled ${imageName}`);
  }
}

/**
 * Upserts an environment variable into project settings.
 */
async function upsertEnvVar(projectId, key, value) {
  try {
    const existing = await environmentRepository.getEnvironmentVariableByKey(
      projectId,
      key,
    );
    if (existing) {
      await environmentRepository.updateEnvironmentVariable(
        existing.id,
        key,
        value,
      );
    } else {
      await environmentRepository.createEnvironmentVariable(
        projectId,
        key,
        value,
      );
    }
  } catch (err) {
    console.warn(`[ManagedDB] Warning injecting env ${key}:`, err.message);
  }
}

/**
 * Provisions a new isolated managed database instance with a dedicated volume and auto-injected env vars.
 */
const provisionDatabase = async (projectId, ownerId, payload = {}) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const engineKey = String(payload.engine || "postgres").toLowerCase();
  const config = ENGINE_CONFIGS[engineKey];
  if (!config) {
    const err = new Error(
      `Unsupported database engine '${engineKey}'. Supported engines: ${Object.keys(
        ENGINE_CONFIGS,
      ).join(", ")}`,
    );
    err.status = 400;
    throw err;
  }

  const rawName = String(payload.name || `${engineKey}-db`).trim();
  const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 30) || `${engineKey}-db`;
  const version = payload.version || config.defaultVersion;
  const image = config.getImage(version);

  // Generate secure database credentials
  const slugId = projectId.slice(0, 8);
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const dbName = `db_${cleanName.replace(/[^a-z0-9]/g, "_")}`;
  const dbUser = `user_${cleanName.replace(/[^a-z0-9]/g, "_").slice(0, 10)}_${randomSuffix}`;
  const dbPassword = crypto.randomBytes(16).toString("hex");

  // Allocate unique host port
  const hostPort = await portService.getAvailablePort(projectId);
  const internalPort = config.internalPort;

  // Dedicated container & volume identifiers
  const containerName = `echo-db-${slugId}-${cleanName}-${Date.now().toString(36)}`;
  const volumeName = `echodb_vol_${slugId}_${randomSuffix}`;

  console.log(`[ManagedDB] Creating database container ${containerName} (image: ${image}, port: ${hostPort}:${internalPort})...`);

  // Ensure volume exists
  await docker.createVolume({ Name: volumeName });

  // Ensure Docker image is available
  await ensureImagePulled(image);

  // Prepare container configuration
  const containerOptions = {
    Image: image,
    name: containerName,
    Cmd: config.getCmd ? config.getCmd({ dbPassword }) : undefined,
    Env: config.getEnv ? config.getEnv({ dbName, dbUser, dbPassword }) : [],
    ExposedPorts: {
      [`${internalPort}/tcp`]: {},
    },
    HostConfig: {
      PortBindings: {
        [`${internalPort}/tcp`]: [{ HostPort: String(hostPort) }],
      },
      Binds: [`${volumeName}:${config.mountPath}`],
      RestartPolicy: { Name: "unless-stopped" },
      Memory: 512 * 1024 * 1024, // 512 MB safety limit
    },
  };

  const container = await docker.createContainer(containerOptions);
  await container.start();

  const connectionString = config.getConnectionString({
    host: "localhost",
    port: hostPort,
    dbName,
    dbUser,
    dbPassword,
  });

  // Store metadata record in database
  const { rows } = await pool.query(
    `
    INSERT INTO managed_databases
      (project_id, owner_id, name, engine, version, container_name, host_port, internal_port, db_name, db_user, db_password, status, volume_name, connection_string, created_at, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'running', $12, $13, NOW(), NOW())
    RETURNING *
    `,
    [
      projectId,
      ownerId,
      cleanName,
      engineKey,
      version,
      containerName,
      hostPort,
      internalPort,
      dbName,
      dbUser,
      dbPassword,
      volumeName,
      connectionString,
    ],
  );

  const databaseRecord = rows[0];

  // Auto-inject environment variables into the project
  const envVars = config.getEnvVars({
    host: "localhost",
    port: hostPort,
    dbName,
    dbUser,
    dbPassword,
    connectionString,
  });

  for (const [key, val] of Object.entries(envVars)) {
    await upsertEnvVar(projectId, key, val);
  }

  console.log(`[ManagedDB] Successfully provisioned ${cleanName} (${engineKey}) on port ${hostPort}`);

  return databaseRecord;
};

/**
 * Lists all managed databases for a project with live container status.
 */
const listDatabases = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const { rows } = await pool.query(
    `
    SELECT *
    FROM managed_databases
    WHERE project_id = $1
    ORDER BY created_at ASC
    `,
    [projectId],
  );

  // Sync real-time Docker status
  const syncedList = await Promise.all(
    rows.map(async (db) => {
      let liveStatus = db.status;
      try {
        const inspect = await docker.getContainer(db.container_name).inspect();
        if (inspect.State?.Running) {
          liveStatus = "running";
        } else if (inspect.State?.Restarting) {
          liveStatus = "restarting";
        } else {
          liveStatus = "stopped";
        }
      } catch {
        liveStatus = "stopped";
      }

      return {
        ...db,
        status: liveStatus,
      };
    }),
  );

  return syncedList;
};

/**
 * Starts a stopped database container.
 */
const startDatabase = async (projectId, databaseId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const { rows } = await pool.query(
    `SELECT * FROM managed_databases WHERE id = $1 AND project_id = $2`,
    [databaseId, projectId],
  );

  if (rows.length === 0) {
    const err = new Error("Database not found.");
    err.status = 404;
    throw err;
  }

  const db = rows[0];
  const container = docker.getContainer(db.container_name);
  await container.start();

  await pool.query(
    `UPDATE managed_databases SET status = 'running', updated_at = NOW() WHERE id = $1`,
    [databaseId],
  );

  return { ...db, status: "running" };
};

/**
 * Stops a running database container.
 */
const stopDatabase = async (projectId, databaseId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const { rows } = await pool.query(
    `SELECT * FROM managed_databases WHERE id = $1 AND project_id = $2`,
    [databaseId, projectId],
  );

  if (rows.length === 0) {
    const err = new Error("Database not found.");
    err.status = 404;
    throw err;
  }

  const db = rows[0];
  const container = docker.getContainer(db.container_name);
  await container.stop().catch(() => {});

  await pool.query(
    `UPDATE managed_databases SET status = 'stopped', updated_at = NOW() WHERE id = $1`,
    [databaseId],
  );

  return { ...db, status: "stopped" };
};

/**
 * Deletes a managed database: removes container, persistent volume, and database record.
 */
const deleteDatabase = async (projectId, databaseId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const { rows } = await pool.query(
    `SELECT * FROM managed_databases WHERE id = $1 AND project_id = $2`,
    [databaseId, projectId],
  );

  if (rows.length === 0) {
    const err = new Error("Database not found.");
    err.status = 404;
    throw err;
  }

  const db = rows[0];

  // Stop & remove container
  try {
    const container = docker.getContainer(db.container_name);
    await container.remove({ force: true });
  } catch (err) {
    console.warn(`[ManagedDB] Remove container warning:`, err.message);
  }

  // Remove persistent volume
  try {
    const volume = docker.getVolume(db.volume_name);
    await volume.remove();
  } catch (err) {
    console.warn(`[ManagedDB] Remove volume warning:`, err.message);
  }

  // Delete DB record
  await pool.query(`DELETE FROM managed_databases WHERE id = $1`, [databaseId]);

  return { success: true, message: `Database ${db.name} removed successfully.` };
};

module.exports = {
  provisionDatabase,
  listDatabases,
  startDatabase,
  stopDatabase,
  deleteDatabase,
  ENGINE_CONFIGS,
};

