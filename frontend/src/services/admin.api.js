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

export const revokeCustomSubdomain = async (id, reason) => {
  const { data } = await api.post(`/admin/subdomain-requests/${id}/revoke`, {
    reason,
  });
  return data;
};

export const revokeProjectSubdomain = async (projectId, reason) => {
  const { data } = await api.post(`/admin/projects/${projectId}/revoke-subdomain`, {
    reason,
  });
  return data;
};

export const deleteSubdomainRequest = async (id) => {
  const { data } = await api.delete(`/admin/subdomain-requests/${id}`);
  return data;
};

export const sendTestNotification = async (type = "subdomain") => {
  const { data } = await api.post("/admin/notifications/test", { type });
  return data;
};

// -------------------------------------------------------------
// Mailer & Broadcast API
// -------------------------------------------------------------

export const getMailerTemplates = async () => {
  const { data } = await api.get("/admin/mailer/templates");
  return data.data;
};

export const getMailerRecipients = async (audienceType = "all", userIds = []) => {
  const params = { audienceType };
  if (userIds && userIds.length > 0) {
    params.userIds = userIds.join(",");
  }
  const { data } = await api.get("/admin/mailer/recipients", { params });
  return data.data;
};

export const previewMailerEmail = async (payload) => {
  const { data } = await api.post("/admin/mailer/preview", payload);
  return data.data;
};

export const sendMailerTest = async (draft) => {
  const { data } = await api.post("/admin/mailer/test", { draft });
  return data;
};

export const sendMailerBroadcast = async (payload) => {
  const { data } = await api.post("/admin/mailer/send", payload);
  return data;
};

export const getMailerHistory = async (limit = 50) => {
  const { data } = await api.get("/admin/mailer/history", { params: { limit } });
  return data.data;
};


