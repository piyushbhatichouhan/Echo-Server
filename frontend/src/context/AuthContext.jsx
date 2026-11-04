import { createContext, useEffect, useState, useCallback } from "react";
import { login as loginApi, getCurrentUser as getCurrentUserApi } from "../services/auth.api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await getCurrentUserApi();
      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem("echohub_user", JSON.stringify(freshUser));
        return freshUser;
      }
    } catch (err) {
      console.warn("Failed to refresh user profile:", err.message);
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("echohub_token");
    const savedUser = localStorage.getItem("echohub_user");

    if (savedToken) {
      setToken(savedToken);

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Failed to parse saved user", e);
        }
      }

      // Revalidate and sync fresh user permissions from server
      getCurrentUserApi()
        .then((freshUser) => {
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem("echohub_user", JSON.stringify(freshUser));
          }
        })
        .catch((err) => {
          console.warn("Session check warning:", err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
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
    refreshUser,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
