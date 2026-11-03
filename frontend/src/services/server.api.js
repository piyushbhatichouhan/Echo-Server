import api from "./api";

export const getPendingUsers = async () => {
  const response = await api.get("/server/pending-users");
  return response.data.data;
};

export const approveUser = async (id) => {
  const response = await api.post(`/server/users/${id}/approve`);
  return response.data;
};

export const rejectUser = async (id) => {
  const response = await api.post(`/server/users/${id}/reject`);
  return response.data;
};

export const cleanupPorts = async () => {
  const response = await api.post("/server/cleanup-ports");
  return response.data;
};

export const getServerHealth = async () => {
  const response = await api.get("/server/health");
  return response.data.data;
};
