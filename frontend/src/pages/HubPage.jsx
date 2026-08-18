// src/pages/HubPage.jsx
import React, { useState, useEffect, useRef } from "react";
import HubNavbar from "../components/hub/HubNavbar";
import CoreProjects from "../components/hub/CoreProjects";
import UserProjects from "../components/hub/UserProjects";
import { showToast } from "../lib/toast";
import { ENDPOINTS, API_BASE_URL } from "../config/api";
import { getToken, removeToken } from "../services/api";

export default function HubPage() {
  const searchInputRef = useRef(null);
  
  // 1. CHỈ KIỂM TRA SỰ TỒN TẠI CỦA TOKEN
  const token = getToken();
  const isAuthenticated = !!token;

  // 2. TẠO USER TẠM THỜI ĐỂ NAVBAR NHẬN DIỆN TỨC THÌ
  const [user, setUser] = useState(
    isAuthenticated ? {
      username: "loading",
      full_name: "Đang đồng bộ...",
      avatar_url: null 
    } : null
  );

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [errorProjects, setErrorProjects] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);


  // Phím tắt Ctrl+K để focus thanh tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 3. FETCH DỮ LIỆU TỪ SERVER KHI CÓ TOKEN
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("login") === "success") {
      showToast("Hệ thống Aegis nhận dạng thành công!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (isAuthenticated) {
      // Gọt sạch dấu ngoặc kép thừa từ LocalStorage
      const cleanToken = token.replace(/^["']|["']$/g, "").trim();

      // ==========================================
      // A. LẤY HỒ SƠ PROFILE
      // ==========================================
      fetch(ENDPOINTS.AUTH.PROFILE_ME, {
        headers: { Authorization: `Bearer ${cleanToken}` },
      })
        .then((res) => {
          if (res.status === 401) {
            removeToken();
            setUser(null);
            throw new Error("Token đã hết hạn, vui lòng đăng nhập lại!");
          }
          if (!res.ok) throw new Error("Lỗi xác thực máy chủ");
          return res.json();
        })
        .then((data) => {
          if (data && data.data) {
            setUser(data.data);
          }
        })
        .catch((err) => console.error("Cảnh báo Auth:", err.message));

      // ==========================================
      // B. TẢI DANH SÁCH DỰ ÁN (🚀 ĐÃ SỬA LỖI GẠCH CHÉO)
      // ==========================================
      setLoadingProjects(true);
      fetch(ENDPOINTS.PROJECTS.LIST, { // URL tập trung trong urls.js
        headers: { Authorization: `Bearer ${cleanToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Tài khoản chưa được cấp quyền truy cập Không gian triển khai!");
          return res.json();
        })
        .then((data) => setProjects(data.projects || []))
        .catch((err) => setErrorProjects(err.message))
        .finally(() => setLoadingProjects(false));
    }
  }, [isAuthenticated, token]);

  const handleConfirmLogout = () => {
    removeToken();
    setShowLogoutModal(false);
    window.location.reload();
  };

  return (
    <div className="d4m-page flex flex-col min-h-screen text-slate-50 font-sans relative">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      

      {/* MODAL ĐĂNG XUẤT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative z-10 w-full max-w-sm mx-4 p-8 glass-card rounded-3xl border border-white/10 bg-slate-900/90 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 border border-red-500/30 shadow-lg">
              <i className="fa-solid fa-power-off text-3xl text-red-500 animate-pulse"></i>
            </div>
            <h3 className="text-2xl font-heading font-black text-white mb-2">Ngắt Kết Nối?</h3>
            <p className="text-gray-400 text-sm mb-8">Bạn sẽ đăng xuất khỏi hệ sinh thái D4M ID trên thiết bị này.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition">Hủy</button>
              <button onClick={handleConfirmLogout} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition">Thoát</button>
            </div>
          </div>
        </div>
      )}

      {/* THANH NAVBAR */}
      <HubNavbar user={user} onLogoutClick={() => setShowLogoutModal(true)} />

      {/* HEADER TÌM KIẾM */}
      <header className="pt-16 pb-12 text-center relative z-10 flex flex-col items-center px-4">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
          <i className="fa-solid fa-bolt text-yellow-400 mr-1"></i> Mạng Lưới Serverless Nội Bộ
        </div>
        <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tight mb-4 drop-shadow-2xl">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">Cloud Workspace</span>
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-10">
          Trung tâm quản lý, triển khai và vận hành các vi dịch vụ, ứng dụng nội bộ. Tất cả được đồng bộ và cô lập an toàn trong không gian D4M.
        </p>

        <div className="relative w-full max-w-xl group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-gray-500 group-focus-within:text-purple-400 transition-colors"></i>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-16 py-3.5 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-black/60 backdrop-blur-md font-medium shadow-2xl transition"
            placeholder="Tìm kiếm ứng dụng, dự án, từ khóa..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-mono text-gray-300 bg-white/10 border border-white/20 px-2 py-1 rounded-md">Ctrl+K</span>
          </div>
        </div>
      </header>

      {/* DANH SÁCH DỰ ÁN */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 relative z-10 pb-20">
        <CoreProjects searchQuery={searchQuery} />
        <UserProjects
          projects={projects}
          loading={loadingProjects}
          error={errorProjects}
          searchQuery={searchQuery}
          isAuthenticated={isAuthenticated}
        />
      </main>

      <footer className="py-8 border-t border-white/5 bg-black/60 backdrop-blur-2xl relative z-40 mt-auto text-center text-sm text-gray-400">
        <p>© 2026 Crafted with <i className="fa-solid fa-heart text-red-500 mx-0.5 animate-pulse"></i> by <strong className="text-white">d4m-dev</strong></p>
      </footer>
    </div>
  );
}