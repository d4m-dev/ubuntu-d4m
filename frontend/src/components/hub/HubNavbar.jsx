// src/components/hub/HubNavbar.jsx
import React, { useState } from "react";
import { API_BASE_URL, STATIC } from "../../config/api";
import DonateModal from "../donate/DonateModal";
import NotificationBell from "../common/NotificationBell";

export default function HubNavbar({ user, onLogoutClick }) {
  const [showDonate, setShowDonate] = useState(false);
  // Hàm hiển thị avatar an toàn
  const getAvatarUrl = () => {
    if (!user || !user.avatar_url) return STATIC.DEFAULT_AVATAR;
    if (user.avatar_url.startsWith("http")) return user.avatar_url;
    return API_BASE_URL + user.avatar_url;
  };

  return (
    <nav className="w-full relative z-40 border-b border-white/5 bg-black/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        {/* LOGO */}
        <a href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
            <i className="fa-solid fa-cloud text-white text-sm"></i>
          </div>
          <span className="font-heading font-black text-xl tracking-wide text-white">
            D4M<span className="text-gray-500">.HUB</span>
          </span>
        </a>

        <div>
          {!user ? (
            // TRẠNG THÁI 1: CHƯA ĐĂNG NHẬP (user = null)
            <button
              onClick={() => (window.location.href = `/auth?redirect=${window.location.pathname}`)}
              className="relative px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full backdrop-blur-md border border-white/10 transition flex items-center gap-2 font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)]"
            >
              <i className="fa-solid fa-fingerprint text-blue-400 animate-pulse"></i> Xác Thực D4M
            </button>
          ) : user.username === "loading" ? (
            // TRẠNG THÁI 2: ĐANG TẢI DỮ LIỆU TỪ SERVER
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pr-4 pl-4 py-2 backdrop-blur-md opacity-80">
              <i className="fa-solid fa-circle-notch fa-spin text-blue-400"></i>
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">Đang đồng bộ...</span>
            </div>
          ) : (
            // TRẠNG THÁI 3: ĐÃ LẤY THÀNH CÔNG THÔNG TIN PROFILE
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pr-1.5 pl-4 py-1.5 backdrop-blur-md shadow-lg transition hover:bg-white/10">
              <a href="/admin/profile" className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                    Tư Lệnh
                  </p>
                  <p className="font-bold text-sm text-white leading-none group-hover:text-blue-400 transition-colors">
                    {user.full_name || user.username}
                  </p>
                </div>
                <img
                  src={getAvatarUrl()}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-blue-500/50 object-cover shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                />
              </a>
              <div className="w-px h-5 bg-white/20"></div>
              {/* 💰 NÚT DONATE / KÍCH HOẠT TÀI KHOẢN */}
              <button
                onClick={() => setShowDonate(true)}
                className="px-3 h-8 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                title="Donate & kích hoạt tài khoản"
              >
                <i className="fa-solid fa-heart"></i>
                <span className="hidden sm:inline">Donate</span>
              </button>
              <button
                onClick={onLogoutClick}
                className="w-8 h-8 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition"
                title="Đăng xuất"
              >
                <i className="fa-solid fa-right-from-bracket text-sm"></i>
              </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 💰 DONATE MODAL */}
      <DonateModal open={showDonate} onClose={() => setShowDonate(false)} />
    </nav>
  );
}