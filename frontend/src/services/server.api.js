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

export const pruneDocker = async () => {
  const response = await api.post("/server/prune-docker");
  return response.data;
};

export const getServerHealth = async () => {

  const response = await api.get("/server/health");
  return response.data.data;
};

export const getServerLogs = async (params = {}) => {
  const response = await api.get("/server/logs", { params });
  return response.data.data;
};

export const getLogContainers = async () => {
  const response = await api.get("/server/logs/containers");
  return response.data.data;
};

export const clearServerLogs = async () => {
  const response = await api.delete("/server/logs");
  return response.data;
};
