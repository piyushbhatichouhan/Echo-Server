import api from "./api";

export const getPublication = async (projectId) => {
  const { data } = await api.get(`/projects/publication/${projectId}/publish`);

  return data.data;
};

export const checkSubdomainAvailability = async (subdomain) => {
  const { data } = await api.get(`/projects/publication/check-subdomain`, {
    params: { subdomain },
  });

  return data.data;
};

export const publishProject = async (projectId, options = {}) => {
  const { data } = await api.post(
    `/projects/publication/${projectId}/publish`,
    options,
  );

  return data.data;
};

export const unpublishProject = async (projectId) => {
  await api.delete(`/projects/publication/${projectId}/publish`);
};

