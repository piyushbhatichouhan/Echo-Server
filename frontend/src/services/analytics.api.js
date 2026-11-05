import api from "./api";

/**
 * Fetches traffic & HTTP analytics for a project.
 * @param {string} projectId 
 * @param {'24h' | '7d' | '30d'} timeRange 
 */
export const getProjectAnalytics = async (projectId, timeRange = "24h") => {
  const response = await api.get(`/projects/${projectId}/analytics`, {
    params: { timeRange },
  });
  return response.data.data;
};

/**
 * Simulates test traffic requests for a project.
 * @param {string} projectId 
 * @param {number} count 
 */
export const simulateProjectTraffic = async (projectId, count = 25) => {
  const response = await api.post(`/projects/${projectId}/analytics/simulate`, {
    count,
  });
  return response.data;
};

/**
 * Fetches platform-wide per-user traffic telemetry for SuperAdmin.
 */
export const getSuperAdminUserAnalytics = async () => {
  const response = await api.get("/server/analytics/users");
  return response.data.data;
};
