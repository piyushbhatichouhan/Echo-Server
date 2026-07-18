import { createContext, useEffect, useState } from "react";
import { login as loginApi } from "../services/auth.api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("echohub_token");
    const savedUser = localStorage.getItem("echohub_user");

    if (savedToken) {
      setToken(savedToken);
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await loginApi(email, password);

    const { token, user } = response;

    localStorage.setItem("echohub_token", token);
    localStorage.setItem("echohub_user", JSON.stringify(user));

    setToken(token);
    setUser(user);

    return response;
  };
  const logout = () => {
    localStorage.removeItem("echohub_token");
    localStorage.removeItem("echohub_user");

    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
