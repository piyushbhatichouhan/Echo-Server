const fs = require("fs/promises");

const storage = require("../config/storage");

const dockerService = require("../docker/docker.service");

const { pool } = require("../config/database");

async function checkStorage() {
  console.log("Checking storage...");

  const folders = [
    storage.projects,
    storage.git,
    storage.cloud,
    storage.backups,
    storage.published,
    storage.temp,
    storage.logs,
  ];

  for (const folder of folders) {
    await fs.mkdir(folder, {
      recursive: true,
    });
  }

  console.log("✓ Storage OK");
}

async function checkDocker() {
  console.log("Checking Docker...");

  const alive = await dockerService.ping();

  if (!alive) {
    throw new Error("Docker daemon is not available.");
  }

  console.log("✓ Docker OK");
}

async function checkDatabase() {
  console.log("Checking PostgreSQL...");

  const client = await pool.connect();
  try {
    // Ensure deployments.port is nullable so dead/stopped deployments don't violate not-null
    // and project_settings columns have robust defaults
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'deployments' AND column_name = 'port' AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE deployments ALTER COLUMN port DROP NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_settings') THEN
          ALTER TABLE project_settings ALTER COLUMN working_directory SET DEFAULT '.';
          ALTER TABLE project_settings ALTER COLUMN output_directory SET DEFAULT '.';
          ALTER TABLE project_settings ALTER COLUMN dockerfile SET DEFAULT '';
          ALTER TABLE project_settings ALTER COLUMN install_command SET DEFAULT '';
          ALTER TABLE project_settings ALTER COLUMN build_command SET DEFAULT '';
          ALTER TABLE project_settings ALTER COLUMN start_command SET DEFAULT '';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deployments') THEN
          ALTER TABLE deployments ADD COLUMN IF NOT EXISTS commit_hash VARCHAR(40);
          ALTER TABLE deployments ADD COLUMN IF NOT EXISTS commit_message TEXT;
          ALTER TABLE deployments ADD COLUMN IF NOT EXISTS commit_author VARCHAR(100);
          ALTER TABLE deployments ADD COLUMN IF NOT EXISTS git_branch VARCHAR(100);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_repository') THEN
          ALTER TABLE project_repository ADD COLUMN IF NOT EXISTS access_token TEXT;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'files') THEN
          ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cloud_files') THEN
          ALTER TABLE cloud_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
        END IF;
      END $$;
    `);
  } catch (err) {
    console.warn("[Validator] Schema alignment notice:", err.message);
  } finally {
    client.release();
  }

  console.log("✓ PostgreSQL OK");
}

const portService = require("../services/port.service");

async function checkPorts() {
  console.log("Checking and cleaning pseudo ports...");
  await portService.cleanupPseudoPorts();
  console.log("✓ Ports OK");
}

async function validateStartup() {
  console.log("");
  console.log("======================================");
  console.log(" EchoHub Startup Validation");
  console.log("======================================");

  await checkStorage();

  await checkDocker();

  await checkDatabase();

  await checkPorts();

  console.log("");
  console.log("✓ Startup validation completed");
  console.log("");
}

module.exports = {
  validateStartup,
};
