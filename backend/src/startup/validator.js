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
          ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cloud_files') THEN
          ALTER TABLE cloud_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
          ALTER TABLE cloud_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_expires TIMESTAMPTZ;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS can_custom_subdomain BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deployment_logs') THEN
          ALTER TABLE deployment_logs ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'info';
          ALTER TABLE deployment_logs ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'system';
        END IF;

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens_hash ON password_reset_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_pwd_reset_tokens_user ON password_reset_tokens(user_id);

        CREATE TABLE IF NOT EXISTS http_analytics (
          id BIGSERIAL PRIMARY KEY,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status_code INT NOT NULL,
          response_time_ms INT NOT NULL,
          ip_hash VARCHAR(64),
          method VARCHAR(10) DEFAULT 'GET',
          path TEXT DEFAULT '/',
          bytes_sent BIGINT DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_analytics_proj_time ON http_analytics(project_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_user_time ON http_analytics(user_id, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON http_analytics(timestamp DESC);
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
const { verifyMailConnection, getFromAddress } = require("../services/mail.service");

async function checkPorts() {
  console.log("Checking and cleaning pseudo ports...");
  await portService.cleanupPseudoPorts();
  console.log("✓ Ports OK");
}

async function checkMail() {
  console.log("Checking Mail SMTP...");
  const status = await verifyMailConnection();
  if (status.ok) {
    console.log(`✓ Mail SMTP OK (sender: ${getFromAddress()})`);
  } else {
    console.log(`ℹ Mail SMTP notice: ${status.message}`);
  }
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

  await checkMail();

  console.log("");
  console.log("✓ Startup validation completed");
  console.log("");
}

module.exports = {
  validateStartup,
};
