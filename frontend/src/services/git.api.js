import api from "./api";

export const getRepository = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/git`);

  return response.data.data;
};

export const validateRepository = async (projectId, url, branch) => {
  const response = await api.post(`/projects/${projectId}/git/validate`, {
    url,
    branch,
  });

  return response.data.data;
};

export const connectRepository = async (projectId, url, branch) => {
  const response = await api.post(`/projects/${projectId}/git`, {
    url,
    branch,
  });

  return response.data.data;
};

export const disconnectRepository = async (projectId) => {
  await api.delete(`/projects/${projectId}/git`);
};

export const cloneRepository = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/git/clone`);

  return response.data.data;
};

export const getGitStatus = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/git/status`);

  return response.data.data;
};

export const commitChanges = async (projectId, message) => {
  const response = await api.post(`/projects/${projectId}/git/commit`, {
    message,
  });

  return response.data.data;
};
