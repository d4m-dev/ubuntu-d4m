/**
 * API client (D4M Music Pro — bản gộp)
 * Dùng đường dẫn tương đối /api và mount music ở /api/dmusic/*
 * Tương thích token với toàn hệ sinh thái D4M (d4m_sso_token / d4m_token)
 */
import { DMUSIC } from "../config/urls";

const TOKEN_KEY = "d4m_sso_token";
const USER_KEY = "d4m_user";

export function getToken() {
  try {
    return (
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token") ||
      localStorage.getItem("token")
    );
  } catch {
    return null;
  }
}
export function setToken(t) {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {}
}
export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function setUser(u) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {}
}
export function clearSession() {
  try {
    localStorage.removeItem("d4m_sso_token");
    localStorage.removeItem("d4m_token");
    localStorage.removeItem(USER_KEY);
  } catch {}
}

const TIMEOUT_MS = 15000;

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Yêu cầu hết thời gian, vui lòng thử lại.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || "Yêu cầu thất bại";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  delete: (path) => request("DELETE", path),
};

// ===== Auth (D4M Music) — URL lấy từ config/urls.js =====
export const authApi = {
  login: (username, password) => api.post(DMUSIC.AUTH.LOGIN, { username, password }),
  register: (payload) => api.post(DMUSIC.AUTH.REGISTER, payload),
  guest: (username) => api.post(DMUSIC.AUTH.GUEST, { username }),
};
