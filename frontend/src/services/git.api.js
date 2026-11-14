import api from "./api";

export const getRepository = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/git`);

  return response.data.data;
};

export const validateRepository = async (projectId, url, branch, token = null) => {
  const response = await api.post(`/projects/${projectId}/git/validate`, {
    url,
    branch,
    token,
  });

  return response.data.data;
};

export const connectRepository = async (projectId, url, branch, token = null) => {
  const response = await api.post(`/projects/${projectId}/git`, {
    url,
    branch,
    token,
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

export const pullRepository = async (projectId) => {
  const { data } = await api.post(`/projects/${projectId}/git/pull`);

  return data;
};

export const pushRepository = async (projectId) => {
  const { data } = await api.post(`/projects/${projectId}/git/push`);

  return data;
};

export const fetchRepository = async (projectId) => {
  const { data } = await api.post(`/projects/${projectId}/git/fetch`);

  return data;
};

export const getCommits = async (projectId, limit = 15) => {
  const response = await api.get(`/projects/${projectId}/git/commits?limit=${limit}`);

  return response.data.data;
};

export const getBranches = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/git/branches`);

  return response.data.data;
};

export const switchBranch = async (projectId, branch) => {
  const response = await api.post(`/projects/${projectId}/git/branch`, {
    branch,
  });

  return response.data.data;
};

export const getFileDiff = async (projectId, file = null) => {
  const url = file
    ? `/projects/${projectId}/git/diff?file=${encodeURIComponent(file)}`
    : `/projects/${projectId}/git/diff`;
  const response = await api.get(url);

  return response.data.data;
};

export const toggleAutoDeploy = async (projectId, autoDeploy) => {
  const response = await api.patch(`/projects/${projectId}/git/auto-deploy`, {
    autoDeploy,
  });

  return response.data.data;
};

export const regenerateWebhookSecret = async (projectId) => {
  const response = await api.post(`/projects/${projectId}/git/webhook-secret/regenerate`);

  return response.data.data;
};


