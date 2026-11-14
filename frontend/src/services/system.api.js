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

  // Client-side direct browser fallback (works even if Docker backend cannot reach public reflectors)
  try {
    const directRes = await fetch("https://api4.ipify.org?format=json");
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.ip) return String(data.ip).trim();
    }
  } catch (_) {}

  try {
    const directRes2 = await fetch("https://api.ipify.org?format=json");
    if (directRes2.ok) {
      const data2 = await directRes2.json();
      if (data2?.ip) return String(data2.ip).trim();
    }
  } catch (_) {}

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

