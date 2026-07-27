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

export const updateStorageLimit = async (userId, storageLimit) => {
  const res = await api.patch(`/admin/users/${userId}/storage-limit`, {
    storageLimit,
  });

  return res.data.data;
};

export const updateQuota = (userId, storageLimit) =>
  api.patch(`/storage/users/${userId}/quota`, {
    storageLimit,
  });
