const { pool } = require("../config/database");

const allocatePort = async () => {
  const result = await pool.query(
    `
    SELECT port
    FROM projects
    ORDER BY port ASC
    `,
  );

  let port = 3001;

  for (const row of result.rows) {
    if (row.port !== port) {
      break;
    }

    port++;
  }

  return port;
};

module.exports = {
  allocatePort,
};
