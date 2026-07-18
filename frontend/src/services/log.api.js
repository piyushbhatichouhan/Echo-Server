import api from "./api";

export const getLogs = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/logs`);

  return res.data;
};
