// src/services/api.js
import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");
export const API = `${API_BASE_URL}/api`;

export const getToken = () => {
  const token = 
    localStorage.getItem("d4m_sso_token") || 
    localStorage.getItem("d4m_token") || 
    localStorage.getItem("token");
  return token ? token.replace(/^["']|["']$/g, "") : null;
};

export const setToken = (token) => {
  localStorage.setItem("d4m_sso_token", token);
};

export const removeToken = () => {
  localStorage.removeItem("d4m_sso_token");
  localStorage.removeItem("token");
  localStorage.removeItem("d4m_user");
};

export const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// ==========================================
// PHẦN CODE src/lib/api.js
// ==========================================

const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;