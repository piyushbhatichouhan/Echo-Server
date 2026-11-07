import api from "./api";

export const getPublication = async (projectId) => {
  const { data } = await api.get(`/projects/publication/${projectId}/publish`);

  return data.data;
};

export const checkSubdomainAvailability = async (subdomain, projectId = null) => {
  const params = { subdomain };
  if (projectId) {
    params.projectId = projectId;
  }

  const { data } = await api.get(`/projects/publication/check-subdomain`, {
    params,
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

export const updateSubdomain = async (projectId, options = {}) => {
  const { data } = await api.patch(
    `/projects/publication/${projectId}/subdomain`,
    options,
  );

  return data.data;
};

export const unpublishProject = async (projectId) => {
  await api.delete(`/projects/publication/${projectId}/publish`);
};

export const getSubdomainRequest = async (projectId) => {
  const { data } = await api.get(`/projects/publication/${projectId}/subdomain-request`);
  return data.data;
};

export const requestCustomSubdomain = async (projectId, subdomain) => {
  const { data } = await api.post(`/projects/publication/${projectId}/subdomain-request`, {
    subdomain,
  });
  return data;
};

export const cancelSubdomainRequest = async (projectId) => {
  const { data } = await api.delete(`/projects/publication/${projectId}/subdomain-request`);
  return data;
};

