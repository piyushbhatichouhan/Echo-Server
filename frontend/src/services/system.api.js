import api from "./api";

export const getDeploymentGuide = async () => {
  const res = await api.get("/system/guide");
  return res.data.data;
};

export const getOutboundIp = async (refresh = false) => {
  const res = await api.get(`/system/outbound-ip${refresh ? "?refresh=true" : ""}`);
  return res.data?.data?.outboundIp;
};

export const getCloudflareStatus = async () => {
  try {
    const res = await api.get("/system/cloudflare/status");
    return res.data?.data;
  } catch {
    return { isConfigured: false };
  }
};

