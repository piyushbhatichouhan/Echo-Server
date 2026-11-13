import api from "./api";

export const getProjects = async () => {
  const res = await api.get("/projects");

  return res.data.data;
};

export const createProject = async (data) => {
  const res = await api.post("/projects", data);

  return res.data.data;
};

export const getProject = async (id) => {
  const res = await api.get(`/projects/${id}`);

  return res.data.data;
};

export const deleteProject = async (id) => {
  const res = await api.delete(`/projects/${id}`);

  return res.data;
};

export const detectFramework = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/detect-framework`);
  return res.data.data;
};

export const applyDetectedPreset = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/apply-detected-preset`);
  return res.data;
};

export const rollbackDeployment = async (projectId, deploymentId) => {
  const res = await api.post(
    `/projects/${projectId}/deployments/${deploymentId}/rollback`,
  );
  return res.data;
};

export const getContainerTelemetry = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/telemetry`);
  return res.data.data;
};

export const executeTerminalCommand = async (projectId, command) => {
  const res = await api.post(`/projects/${projectId}/terminal`, { command });
  return res.data.data;
};

export const getUserResourceMetrics = async () => {
  const res = await api.get("/projects/resource-metrics");
  return res.data.data;
};
