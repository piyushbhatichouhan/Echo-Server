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

  client.release();

  console.log("✓ PostgreSQL OK");
}

async function validateStartup() {
  console.log("");
  console.log("======================================");
  console.log(" EchoHub Startup Validation");
  console.log("======================================");

  await checkStorage();

  await checkDocker();

  await checkDatabase();

  console.log("");
  console.log("✓ Startup validation completed");
  console.log("");
}

module.exports = {
  validateStartup,
};
