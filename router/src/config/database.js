const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "echo_db",
  user: process.env.DB_USER || "echo_user",
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_MAX_CONNECTIONS) || 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Prevent unhandled error event from crashing the process on idle client drop
pool.on("error", (err) => {
  console.error("[Database Pool Notice]:", err.message);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDatabase = async () => {
  let attempt = 1;

  while (true) {
    try {
      console.log(`🔄 Connecting to PostgreSQL... (Attempt ${attempt})`);

      const client = await pool.connect();

      console.log("📦 PostgreSQL connected successfully");

      client.release();
      return;
    } catch (error) {
      console.error(`❌ PostgreSQL connection failed: ${error.message}`);
      console.log("⏳ Retrying in 5 seconds...\n");

      attempt++;

      await sleep(5000);
    }
  }
};

const closeDatabase = async () => {
  try {
    await pool.end();
    console.log("📦 PostgreSQL pool closed gracefully");
  } catch (err) {
    console.warn("PostgreSQL pool close warning:", err.message);
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  connectDatabase,
  closeDatabase,
};
