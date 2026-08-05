const { pool } = require("../config/database");

const getProjectsByOwner = async (ownerId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM projects
    WHERE owner_id = $1
    `,
    [ownerId],
  );

  return result.rows;
};

const deleteProjectTx = async (client, projectId) => {
  await client.query(
    `
    DELETE FROM projects
    WHERE id = $1
    `,
    [projectId],
  );
};

const deleteProjectRecordTx = async (client, projectId) => {
  await client.query(
    `
    DELETE FROM projects
    WHERE id = $1
    `,
    [projectId],
  );
};

const getProjects = async () => {
  const result = await pool.query(`
    SELECT
      id,
      owner_id,
      name
    FROM projects
    ORDER BY name
  `);

  return result.rows;
};

const getById = async (id) => {
  const result = await db.query(
    `
    SELECT *
    FROM projects
    WHERE id = $1
    LIMIT 1
    `,
    [id],
  );

  return result.rows[0] || null;
};

module.exports = {
  getProjectsByOwner,
  deleteProjectTx,
  deleteProjectRecordTx,
  getProjects,
  getById,
};
