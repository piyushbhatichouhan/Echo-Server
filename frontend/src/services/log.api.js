import api from "./api";

export const getLogs = async (projectId, params = {}) => {
  const res = await api.get(`/projects/${projectId}/logs`, { params });

  return res.data;
};

export const clearLogs = async (projectId) => {
  const res = await api.delete(`/projects/${projectId}/logs`);

  return res.data;
};
