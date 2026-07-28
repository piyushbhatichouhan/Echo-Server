const projectService = require("./project.service");
const environmentRepository = require("../repositories/environment.repository");

const getEnvironmentVariables = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return await environmentRepository.getEnvironmentVariables(projectId);
};

const createEnvironmentVariable = async (
  projectId,
  ownerId,
  { key, value },
) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const existing = await environmentRepository.getEnvironmentVariableByKey(
    projectId,
    key,
  );

  if (existing) {
    const err = new Error("Environment variable already exists.");
    err.status = 409;
    throw err;
  }

  return await environmentRepository.createEnvironmentVariable(
    projectId,
    key,
    value,
  );
};

const updateEnvironmentVariable = async (
  projectId,
  variableId,
  ownerId,
  { key, value },
) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return await environmentRepository.updateEnvironmentVariable(
    variableId,
    key,
    value,
  );
};

const deleteEnvironmentVariable = async (projectId, variableId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  return await environmentRepository.deleteEnvironmentVariable(variableId);
};

module.exports = {
  getEnvironmentVariables,
  createEnvironmentVariable,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
};
