import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  getUser, setUser, setToken, clearSession, getToken,
  authApi,
} from "../../../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getToken() && getUser()) {
      setUserState(getUser());
    }
    setLoading(false);
  }, []);

  const applyAuth = useCallback((data) => {
    setToken(data.access_token);
    setUser(data.user);
    setUserState(data.user);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    applyAuth(data);
    toast.success(`Chào mừng trở lại, ${data.user.full_name || data.user.username}!`);
    return data.user;
  }, [applyAuth]);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    applyAuth(data);
    toast.success("Đăng ký thành công. Chúc mừng bạn!");
    return data.user;
  }, [applyAuth]);

  const guest = useCallback(async (name) => {
    const data = await authApi.guest(name || "Khách");
    applyAuth(data);
    return data.user;
  }, [applyAuth]);

  const logout = useCallback(() => {
    clearSession();
    setUserState(null);
    toast.info("Đã đăng xuất.");
  }, []);

  const value = {
    user,
    loading,
    login,
    register,
    guest,
    logout,
    isAuthed: !!user,
    isAdmin: !!user && user.role === 1,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
