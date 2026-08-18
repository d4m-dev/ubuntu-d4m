// src/components/home/HomeNavbar.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ENDPOINTS } from "../../config/api";

export default function HomeNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);

  // 🚀 KIỂM TRA TRẠNG THÁI VÀ XÁC THỰC TOKEN VỚI MÁY CHỦ API
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("d4m_token");
    const cachedUser = localStorage.getItem("d4m_user");

    // 1. Hiển thị tạm dữ liệu cache để UI không bị giật
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {
        setUser(null);
      }
    }

    // 2. Nếu có token, gọi API /api/auth/profile/me để xác thực trực tiếp
    if (token) {
      try {
        const res = await fetch(ENDPOINTS.AUTH.PROFILE_ME, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const result = await res.json();
          const liveUser = result.data || result;
          setUser(liveUser);
          localStorage.setItem("d4m_user", JSON.stringify(liveUser));
        } else if (res.status === 401) {
          // Token hết hạn hoặc sai lệch -> Xóa phiên đăng nhập
          localStorage.removeItem("d4m_token");
          localStorage.removeItem("d4m_user");
          setUser(null);
        }
      } catch (err) {
        console.warn("⚠️ Không thể kết nối tới máy chủ API để xác thực:", err.message);
      }
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("d4m_auth_change", checkAuth);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("d4m_auth_change", checkAuth);
    };
  }, [checkAuth]);

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem("d4m_token");
    localStorage.removeItem("d4m_user");
    setUser(null);
    window.dispatchEvent(new Event("d4m_auth_change"));
    window.location.href = "/";
  };

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav
      className={`fixed top-4 left-0 right-0 z-50 max-w-7xl mx-auto px-4 transition-all duration-300 ${
        isScrolled ? "-translate-y-1.5" : ""
      }`}
    >
      <div className="bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-full px-6 h-16 flex justify-between items-center shadow-2xl">
        <a href="#" onClick={scrollToTop} className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <i className="fa-solid fa-cloud text-white text-sm"></i>
          </div>
          <span className="font-heading font-black text-xl tracking-tight text-white">
            D4M<span className="text-blue-400 font-extrabold">.Cloud</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
          <a href="#features" className="hover:text-blue-400 transition-colors">Hệ Sinh Thái</a>
          <a href="#security" className="hover:text-blue-400 transition-colors">Aegis Shield</a>
          <a href="/admin/admin-scripts" className="hover:text-purple-400 transition-colors">
            <i className="fa-solid fa-terminal mr-1"></i> Cronjobs
          </a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/admin/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-blue-500/50 transition"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {user.full_name ? user.full_name[0] : "D"}
                </div>
                <span className="text-xs font-bold text-white max-w-[100px] truncate">
                  {user.full_name || user.username || "Admin"}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center transition text-xs"
              >
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          ) : (
            <>
              <Link to="/auth" className="hidden sm:block text-sm font-bold text-gray-300 hover:text-white transition-colors">
                Đăng nhập
              </Link>
              <Link
                to="/hub"
                className="btn-glow-master px-6 py-2 text-white text-sm font-bold rounded-full flex items-center gap-2 group shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                <span>Mở Trạm Hub</span> <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}