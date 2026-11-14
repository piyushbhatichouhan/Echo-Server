import api from "./api";

export const getDeploymentGuide = async () => {
  const res = await api.get("/system/guide");
  return res.data.data;
};

export const getOutboundIp = async (refresh = false) => {
  try {
    const res = await api.get(`/system/outbound-ip${refresh ? "?refresh=true" : ""}`);
    const ip = res.data?.data?.outboundIp;
    if (ip && typeof ip === "string" && ip.trim()) {
      return ip.trim();
    }
  } catch (err) {
    console.warn("[System API] Server IP endpoint failed:", err.message);
  }
  return null;
};

export const getCloudflareStatus = async () => {
  try {
    const res = await api.get("/system/cloudflare/status");
    return res.data?.data;
  } catch {
    return { isConfigured: false };
  }
};

