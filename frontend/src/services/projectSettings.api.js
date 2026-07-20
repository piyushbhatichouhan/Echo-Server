import api from "./api";

export const getProjectSettings = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/settings`);

  return response.data.data;
};

export const updateProjectSettings = async (projectId, settings) => {
  const response = await api.put(`/projects/${projectId}/settings`, settings);

  return response.data.data;
};
