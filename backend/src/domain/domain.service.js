const domainRepository = require("./domain.repository");

const projectRepository = require("../repositories/project.repository");
const userRepository = require("../repositories/user.repository");

const { buildHostname } = require("./hostname.generator");

const RESERVED = require("./reserved.hostnames");

const assign = async (projectId) => {
  // 1. Load project
  const project = await projectRepository.getById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  // 2. Load owner
  const owner = await userRepository.getById(project.owner_id);

  if (!owner) {
    throw new Error("Owner not found");
  }

  // 3. Generate base hostname
  let hostname = buildHostname(owner.username, project.name);

  let base = hostname.replace(".devpiyush.in", "");

  // 4. Reserved names
  if (RESERVED.includes(base)) {
    throw new Error("Reserved hostname");
  }

  // 5. Find available hostname
  let candidate = hostname;

  let counter = 2;

  while (await domainRepository.hostnameExists(candidate)) {
    candidate = `${base}-${counter}.devpiyush.in`;
    counter++;
  }

  // 6. Save
  return await domainRepository.create({
    project_id: project.id,
    hostname: candidate,
  });
};

const getDomains = async (projectId) => {
  return domainRepository.findAll(projectId);
};

module.exports = {
  assign,
  getDomains,
};
