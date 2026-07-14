import { createContext, useEffect, useState, useCallback } from "react";
import { authService } from "../services/auth.service.js";
import { clearTokens } from "../services/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hasToken = !!localStorage.getItem("dp_access_token");
    if (!hasToken) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (payload) => {
    const newUser = await authService.signup(payload);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => clearTokens());
    setUser(null);
  }, []);

  // Merges freshly-saved fields (e.g. from Settings) into the cached user without a refetch.
  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, updateUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}
