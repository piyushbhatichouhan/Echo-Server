import api from "./api";

export const getUsers = async () => {
  const { data } = await api.get("/admin/users");
  return data.data;
};

export const disableUser = async (id) => {
  const { data } = await api.patch(`/admin/users/${id}/disable`);
  return data;
};

export const enableUser = async (id) => {
  const { data } = await api.patch(`/admin/users/${id}/enable`);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await api.delete(`/admin/users/${id}`);
  return data;
};

export const restoreUser = async (id) => {
  const { data } = await api.post(`/admin/users/${id}/restore`);

  return data;
};

export const toggleCustomSubdomain = async (id, enabled) => {
  const { data } = await api.patch(`/admin/users/${id}/subdomain-access`, {
    enabled,
  });

  return data;
};

export const getSubdomainRequests = async (params = {}) => {
  const { data } = await api.get("/admin/subdomain-requests", { params });
  return data.data;
};

export const getSubdomainRequestStats = async () => {
  const { data } = await api.get("/admin/subdomain-requests/stats");
  return data.data;
};

export const approveSubdomainRequest = async (id) => {
  const { data } = await api.post(`/admin/subdomain-requests/${id}/approve`);
  return data;
};

export const rejectSubdomainRequest = async (id, reason) => {
  const { data } = await api.post(`/admin/subdomain-requests/${id}/reject`, {
    reason,
  });
  return data;
};

export const deleteSubdomainRequest = async (id) => {
  const { data } = await api.delete(`/admin/subdomain-requests/${id}`);
  return data;
};

