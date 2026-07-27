const { pool } = require("../config/database");

const getDashboard = async (userId) => {
  // Total Projects
  const projectsResult = await pool.query(
    `
        SELECT COUNT(*)::int AS total
        FROM projects
        WHERE owner_id = $1
        `,
    [userId],
  );

  // Running Containers
  const runningResult = await pool.query(
    `
        SELECT COUNT(*)::int AS total
        FROM deployments d
        JOIN projects p
            ON p.id = d.project_id
        WHERE
            p.owner_id = $1
            AND LOWER(d.status) = 'running'
        `,
    [userId],
  );

  // Total Deployments
  const deploymentResult = await pool.query(
    `
        SELECT COUNT(*)::int AS total
        FROM deployments d
        JOIN projects p
            ON p.id = d.project_id
        WHERE p.owner_id = $1
        `,
    [userId],
  );

  // Recent Projects
  const recentProjects = await pool.query(
    `
        SELECT

    p.id,

    p.name,

    p.git_connected,

    p.updated_at,

    COALESCE(d.status,'Not Deployed') AS status

FROM projects p

LEFT JOIN LATERAL (

    SELECT
        status,
        updated_at
    FROM deployments
    WHERE project_id = p.id
    ORDER BY updated_at DESC
    LIMIT 1

) d ON TRUE

WHERE p.owner_id = $1

ORDER BY p.updated_at DESC

LIMIT 5;  
        `,
    [userId],
  );

  return {
    overview: {
      projects: projectsResult.rows[0].total,

      running: runningResult.rows[0].total,

      deployments: deploymentResult.rows[0].total,

      storage: "Coming Soon",
    },

    projects: {
      recent: recentProjects.rows,
    },

    activity: {
      recent: [],
    },

    server: {
      cpu: null,

      ram: null,

      disk: null,

      docker: null,
    },
  };
};

module.exports = {
  getDashboard,
};
