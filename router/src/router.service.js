const repository = require("./router.repository");

const resolveHostname = async (hostname) => {
  const row = await repository.getProjectByHostname(hostname);

  if (!row) {
    return null;
  }

  return {
    hostname: row.hostname,

    publication: {
      status: row.publication_status,
      sslStatus: row.ssl_status,
      verificationStatus: row.verification_status,
    },

    project: {
      id: row.project_id,
      name: row.name,
    },

    deployment: {
      containerName: row.container_name,
      containerPort: row.container_port,
      port: row.port,
      status: row.deployment_status,
    },
  };
};

module.exports = {
  resolveHostname,
};
