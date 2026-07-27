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
