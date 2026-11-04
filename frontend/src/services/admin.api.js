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

