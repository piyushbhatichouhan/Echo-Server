import api from "./api";

export const getProjectDatabases = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/databases`);
  return response.data.data;
};

export const provisionDatabase = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/databases`, data);
  return response.data;
};

export const startDatabase = async (projectId, databaseId) => {
  const response = await api.post(
    `/projects/${projectId}/databases/${databaseId}/start`,
  );
  return response.data;
};

export const stopDatabase = async (projectId, databaseId) => {
  const response = await api.post(
    `/projects/${projectId}/databases/${databaseId}/stop`,
  );
  return response.data;
};

export const deleteDatabase = async (projectId, databaseId) => {
  const response = await api.delete(
    `/projects/${projectId}/databases/${databaseId}`,
  );
  return response.data;
};

