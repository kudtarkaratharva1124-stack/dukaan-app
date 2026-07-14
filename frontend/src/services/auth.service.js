import { api, setTokens, clearTokens } from "./api.js";

export const authService = {
  async signup({ shopName, name, email, phone, password }) {
    const { data } = await api.post("/auth/signup", { shopName, name, email, phone, password });
    setTokens(data);
    return data.user;
  },

  async login({ email, password }) {
    const { data } = await api.post("/auth/login", { email, password });
    setTokens(data);
    return data.user;
  },

  async me() {
    const { data } = await api.get("/auth/me");
    return data.user;
  },

  async logout() {
    const refreshToken = localStorage.getItem("dp_refresh_token");
    try {
      await api.post("/auth/logout", { refreshToken });
    } finally {
      clearTokens();
    }
  }
};
