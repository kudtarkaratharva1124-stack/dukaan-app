import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const api = axios.create({ baseURL: BASE_URL });

function getTokens() {
  return {
    accessToken: localStorage.getItem("dp_access_token"),
    refreshToken: localStorage.getItem("dp_refresh_token")
  };
}

export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem("dp_access_token", accessToken);
  if (refreshToken) localStorage.setItem("dp_refresh_token", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("dp_access_token");
  localStorage.removeItem("dp_refresh_token");
}

api.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, try exactly one silent refresh before giving up and logging out.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      const { refreshToken } = getTokens();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      try {
        refreshPromise = refreshPromise || axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { data } = await refreshPromise;
        refreshPromise = null;
        setTokens(data);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
