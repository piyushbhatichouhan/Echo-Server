const { pool } = require("../config/database");

const START_PORT = 3001;

const getAvailablePort = async () => {
  const result = await pool.query(`
    SELECT port
    FROM deployments
    WHERE port IS NOT NULL
    ORDER BY port
  `);

  const used = new Set(result.rows.map((r) => r.port));

  let port = START_PORT;

  while (used.has(port)) {
    port++;
  }

  return port;
};

module.exports = {
  getAvailablePort,
};
