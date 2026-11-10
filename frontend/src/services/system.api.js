import api from "./api";

export const getDeploymentGuide = async () => {
  const res = await api.get("/system/guide");
  return res.data.data;
};

export const getOutboundIp = async () => {
  const res = await api.get("/system/outbound-ip");
  return res.data.data.outboundIp;
};

