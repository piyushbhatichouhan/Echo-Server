import api from "./api";

export const deployProject = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/deploy`);
  return res.data;
};

export const redeployProject = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/redeploy`);
  return res.data;
};

export const startProject = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/start`);
  return res.data;
};

export const stopProject = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/stop`);
  return res.data;
};

export const restartProject = async (projectId) => {
  const res = await api.post(`/projects/${projectId}/restart`);
  return res.data;
};

export const getDeploymentStatus = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/status`);
  return res.data;
};

export const getDeployments = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/deployments`);
  return res.data.data;
};
