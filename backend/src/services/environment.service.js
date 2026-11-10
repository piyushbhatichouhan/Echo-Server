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

const fs = require("fs/promises");
const path = require("path");
const workspace = require("./workspace.service");

const getExampleEnvironmentVariables = async (projectId, ownerId) => {
  await projectService.verifyProjectOwnership(projectId, ownerId);

  const rootPath = workspace.getProjectFilesDirectory(projectId);
  const candidates = [
    { label: ".env.example", fullPath: path.join(rootPath, ".env.example") },
    { label: "backend/.env.example", fullPath: path.join(rootPath, "backend", ".env.example") },
    { label: "frontend/.env.example", fullPath: path.join(rootPath, "frontend", ".env.example") },
    { label: "server/.env.example", fullPath: path.join(rootPath, "server", ".env.example") },
    { label: "client/.env.example", fullPath: path.join(rootPath, "client", ".env.example") },
    { label: ".env.sample", fullPath: path.join(rootPath, ".env.sample") },
  ];

  for (const cand of candidates) {
    try {
      const content = await fs.readFile(cand.fullPath, "utf8");
      const lines = content.split("\n");
      const vars = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let value = trimmed.slice(eqIdx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (key) {
            vars.push({ key, value });
          }
        }
      }

      if (vars.length > 0) {
        return {
          found: true,
          source: cand.label,
          variables: vars,
        };
      }
    } catch {}
  }

  return {
    found: false,
    source: null,
    variables: [],
  };
};

module.exports = {
  getEnvironmentVariables,
  createEnvironmentVariable,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
  getExampleEnvironmentVariables,
};
