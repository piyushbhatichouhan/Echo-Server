import api from "./api";

export const getLogs = async (projectId, params = {}) => {
  const res = await api.get(`/projects/${projectId}/logs`, { params });

  return res.data;
};
