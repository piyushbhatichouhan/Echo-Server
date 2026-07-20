import api from "./api";

export const getEnvironmentVariables = async (projectId) => {
  const res = await api.get(`/projects/${projectId}/environment`);
  return res.data.data;
};

export const createEnvironmentVariable = async (projectId, payload) => {
  const res = await api.post(`/projects/${projectId}/environment`, payload);

  return res.data.data;
};

export const updateEnvironmentVariable = async (
  projectId,
  variableId,
  payload,
) => {
  const res = await api.patch(
    `/projects/${projectId}/environment/${variableId}`,
    payload,
  );

  return res.data.data;
};

export const deleteEnvironmentVariable = async (projectId, variableId) => {
  const res = await api.delete(
    `/projects/${projectId}/environment/${variableId}`,
  );

  return res.data.data;
};
