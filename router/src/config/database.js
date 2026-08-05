const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
