const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Guard against unhandled error events on idle pooled clients crashing the Node.js process
pool.on("error", (err) => {
  console.error("[PostgreSQL Pool Unexpected Client Error]:", err.message);
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

module.exports = {
  pool,

  query: (text, params) => pool.query(text, params),

  connectDatabase,
};
