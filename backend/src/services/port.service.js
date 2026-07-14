const { pool } = require("../config/database");

const allocatePort = async () => {
  const result = await pool.query(
    `
        SELECT MAX(port) AS max_port
FROM deployments
        `,
  );

  const maxPort = result.rows[0].max_port;

  if (maxPort === null) {
    return 3001;
  }

  return maxPort + 1;
};

module.exports = {
  allocatePort,
};
