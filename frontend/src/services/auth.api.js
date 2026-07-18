import api from "./api";

export const login = async (email, password) => {
  const res = await api.post("/auth/login", {
    email,
    password,
  });

  return res.data.data;
};

export const register = async (username, email, password) => {
  const res = await api.post("/auth/register", {
    username,
    email,
    password,
  });

  return res.data.data;
};
