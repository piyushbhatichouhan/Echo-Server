import api from "./api";

export const getProjectDomains = async (projectId) => {
  const { data } = await api.get(`/domains/${projectId}`);
  return data.data;
};

export const addCustomDomain = async (projectId, hostname) => {
  const { data } = await api.post(`/domains/${projectId}/custom`, { hostname });
  return data;
};

export const deleteCustomDomain = async (projectId, domainId) => {
  const { data } = await api.delete(`/domains/${projectId}/custom/${domainId}`);
  return data;
};

export const verifyCustomDomain = async (projectId, domainId) => {
  const { data } = await api.post(`/domains/${projectId}/custom/${domainId}/verify`);
  return data;
};

