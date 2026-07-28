import api from "./api";

export const getOverview = async () => {
  const res = await api.get("/storage/overview");
  return res.data.data;
};

export const getUsers = async () => {
  const res = await api.get("/storage/users");
  return res.data.data;
};

export const getProjects = async () => {
  const res = await api.get("/storage/projects");
  return res.data.data;
};

export const updateQuota = (userId, quota) =>
  api.put(`/admin/users/${userId}/quota`, {
    quota,
  });
