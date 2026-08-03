import api from "./api";

export const login = async (email, password) => {
  const res = await api.post("/auth/login", {
    email,
    password,
  });

  return res.data.data;
};

export const register = async (payload) => {
  const { data } = await api.post("/auth/register", payload);

  return data.data;
};

export const resendVerification = async (data) => {
  const res = await api.post("/auth/resend-verification", data);

  return res.data;
};

export const verifyEmail = async (token) => {
  const res = await api.get(`/auth/verify-email?token=${token}`);

  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await api.post("/auth/forgot-password", {
    email,
  });

  return res.data;
};

export const resetPassword = async (token, password) => {
  const res = await api.put("/auth/reset-password", {
    token,
    password,
  });

  return res.data;
};

export const validateResetToken = async (token) => {
  const res = await api.get(`/auth/reset-password/validate?token=${token}`);

  return res.data;
};

export const getCurrentUser = async () => {
  const res = await api.get("/auth/me");

  return res.data.data;
};

export const deleteAccount = async () => {
  const res = await api.delete("/auth/account");

  return res.data;
};
