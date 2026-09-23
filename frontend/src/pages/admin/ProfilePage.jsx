// src/pages/admin/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ENDPOINTS, API_BASE_URL } from "../../config/api";
import { SOCIAL } from "../../config/urls";
import { showToast } from "../../lib/toast";
import AvatarFrame from "../social/AvatarFrame";
import { SOCIAL_GLOBAL_CSS } from "../social/socialStyles";

// 🎨 7 slot trang bị Spirit v2
const SLOT_META = [
  { kind: "frame",    icon: "🖼️", label: "Khung viền" },
  { kind: "pet",      icon: "🐉", label: "Linh thú" },
  { kind: "treasure", icon: "💎", label: "Linh bảo" },
  { kind: "dharma",   icon: "🔥", label: "Pháp tướng" },
  { kind: "title",    icon: "🏷️", label: "Danh hiệu" },
  { kind: "ring",     icon: "💍", label: "Nhẫn" },
  { kind: "sect",     icon: "⛩️", label: "Tông môn" },
];

export default function ProfilePage() {
  const navigate = useNavigate();

  // =================================================================
  // 1. STATE QUẢN LÝ GIAO DIỆN
  // =================================================================

  const [activeTab, setActiveTab] = useState("basic"); // 'basic' | 'email'

  // =================================================================
  // 2. STATE DỮ LIỆU NGƯỜI DÙNG (PROFILE DATA)
  // =================================================================
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    avatar_url: null,
    phone: "",
    cccd: "",
    dob: "",
    address: "",
    email: "",
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 🖼️ SPIRIT v2 — kho đồ + 7 slot trang bị
  const [spirit, setSpirit] = useState({ xu: 0, equipped: {}, owned: [], frames: [] });
  const [spiritBusy, setSpiritBusy] = useState(null);

  // =================================================================
  // 3. STATE XỬ LÝ ĐỔI EMAIL & OTP
  // =================================================================
  const [emailStep, setEmailStep] = useState(1); // 1 = Nhập Email mới, 2 = Nhập OTP
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // =================================================================
  // 4. KẾT NỐI API & TẢI DỮ LIỆU
  // =================================================================


  const getToken = () => {
    return (
      localStorage.getItem("d4m_sso_token") || localStorage.getItem("d4m_token")
    );
  };

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };
  };

  // 🎨 Inject CSS toàn cục Social Hub (khung viền + badge) — idempotent
  useEffect(() => {
    if (document.getElementById("d4m-social-css")) return;
    const style = document.createElement("style");
    style.id = "d4m-social-css";
    style.textContent = SOCIAL_GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/auth?redirect=/admin/profile");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(ENDPOINTS.AUTH.PROFILE_ME, {
          headers: getHeaders(),
        });
        // 🛡️ Chỉ đăng xuất khi token THẬT SỰ hết hạn (401).
        // Các lỗi khác (mạng, 500...) giữ nguyên phiên để không mất token oan.
        if (res.status === 401) {
          const e = new Error("auth"); e.auth = true; throw e;
        }
        if (!res.ok) throw new Error("load");

        const result = await res.json();
        const data = result.data || result;
        
        setProfile({
          username: data.username || "",
          full_name: data.full_name || "",
          avatar_url: data.avatar_url || null,
          phone: data.phone || "",
          cccd: data.cccd || "",
          dob: data.dob || "",
          address: data.address || "",
          email: data.email || "",
        });
        setIsLoadingProfile(false);
      } catch (err) {
        if (err && err.auth) {
          showToast("Phiên đăng nhập hết hạn!", "error");
          setTimeout(() => {
            localStorage.removeItem("d4m_sso_token");
            localStorage.removeItem("d4m_token");
            navigate("/auth");
          }, 1500);
        } else {
          showToast("Không tải được hồ sơ — kiểm tra kết nối backend.", "error");
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();
    loadSpirit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // =================================================================
  // 4b. TẢI KHO ĐỒ SPIRIT v2 (catalog + trang bị + Xu)
  // =================================================================
  const loadSpirit = async () => {
    try {
      const [catRes, meRes] = await Promise.all([
        fetch(SOCIAL.SPIRIT_CATALOG, { headers: getHeaders() }),
        fetch(SOCIAL.SPIRIT_ME, { headers: getHeaders() }),
      ]);
      const cat = await catRes.json();
      const me = await meRes.json();
      const catalog = cat.data || [];
      const byId = new Map(catalog.map((i) => [i.id, i]));
      const equipped = me.data?.equipped || {};
      const ownedIds = new Set((me.data?.items || []).map((i) => i.id));
      setSpirit({
        xu: me.data?.xu || 0,
        equipped,
        byId,
        frames: catalog.filter((i) => i.kind === "frame"),
        ownedFrames: catalog.filter((i) => i.kind === "frame" && ownedIds.has(i.id)),
        slots: SLOT_META.map((s) => ({ ...s, item: byId.get(equipped[s.kind]) || null })),
      });
    } catch (e) { /* im lặng — spirit là phần bổ sung */ }
  };

  // ⚔️ Trang bị / tháo khung viền (và các slot khác)
  const toggleEquipFrame = async (item) => {
    if (spiritBusy) return;
    const isEquipped = spirit.equipped[item.kind] === item.id;
    setSpiritBusy(item.id);
    try {
      const url = isEquipped ? SOCIAL.SPIRIT_UNEQUIP : SOCIAL.SPIRIT_EQUIP;
      const body = isEquipped ? { kind: item.kind } : { item_id: item.id };
      const res = await fetch(url, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.status === "success") {
        showToast(isEquipped ? "Đã tháo trang bị" : `✨ Đã trang bị ${item.name}!`);
        await loadSpirit();
      } else showToast(data.detail || "Thao tác thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setSpiritBusy(null); }
  };

  // =================================================================
  // 5. CẬP NHẬT HỒ SƠ CƠ BẢN
  // =================================================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      full_name: profile.full_name,
      phone: profile.phone,
      cccd: profile.cccd,
      dob: profile.dob || null,
      address: profile.address,
    };

    try {
      const res = await fetch(ENDPOINTS.AUTH.UPDATE, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Cập nhật hồ sơ cá nhân thành công!");
        
        // Đồng bộ cập nhật d4m_user trong localStorage để đổi tên ở góc màn hình Trạm Hub
        const cachedUserStr = localStorage.getItem("d4m_user");
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          cachedUser.full_name = profile.full_name;
          localStorage.setItem("d4m_user", JSON.stringify(cachedUser));
          window.dispatchEvent(new Event("d4m_auth_change"));
        }
      } else {
        showToast(data.detail || "Có lỗi xảy ra khi lưu", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // =================================================================
  // 6. TẢI ẢNH ĐẠI DIỆN MỚI
  // =================================================================
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingAvatar(true);
    showToast("Đang đẩy ảnh lên Đám Mây...");

    try {
      const res = await fetch(ENDPOINTS.AUTH.AVATAR, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          // KHÔNG gửi Content-Type, trình duyệt sẽ tự set thành multipart/form-data
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.avatar_url) {
        showToast("Cập nhật ảnh đại diện thành công!");
        
        // Cập nhật state với tham số thời gian để vô hiệu hóa cache trình duyệt
        setProfile((prev) => ({
          ...prev,
          avatar_url: `${data.avatar_url}?t=${new Date().getTime()}`,
        }));

        // Đồng bộ lưu vô localStorage
        const cachedUserStr = localStorage.getItem("d4m_user");
        if (cachedUserStr) {
          const cachedUser = JSON.parse(cachedUserStr);
          cachedUser.avatar_url = data.avatar_url;
          localStorage.setItem("d4m_user", JSON.stringify(cachedUser));
          window.dispatchEvent(new Event("d4m_auth_change"));
        }
      } else {
        showToast(data.detail || "Lỗi cập nhật ảnh", "error");
      }
    } catch (err) {
      showToast("Mất kết nối máy chủ khi tải ảnh", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // =================================================================
  // 7. QUY TRÌNH ĐỔI EMAIL BẰNG MÃ OTP
  // =================================================================
  const requestEmailOTP = async () => {
    if (!newEmail) return showToast("Sếp vui lòng nhập Email mới", "error");

    setIsEmailLoading(true);
    try {
      const res = await fetch(ENDPOINTS.AUTH.CHANGE_EMAIL_REQ, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ new_email: newEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`Đã bắn mã OTP đến ${newEmail}`);
        setEmailStep(2); // Chuyển qua màn nhập OTP
      } else {
        showToast(data.detail || "Lỗi xử lý yêu cầu", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (emailOtp.length < 6) return showToast("Mã OTP phải gồm 6 số", "error");

    setIsEmailLoading(true);
    try {
      const res = await fetch(ENDPOINTS.AUTH.CHANGE_EMAIL_VERIFY, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ new_email: newEmail, otp: emailOtp }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Đổi Email thành công rực rỡ!");
        setProfile((prev) => ({ ...prev, email: newEmail }));
        setNewEmail("");
        setEmailOtp("");
        setEmailStep(1);
        setActiveTab("basic"); // Về lại màn hình thông tin cơ bản
      } else {
        showToast(data.detail || "Mã OTP không hợp lệ", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // =================================================================
  // FORMAT ĐƯỜNG DẪN ẢNH AVATAR
  // =================================================================
  const getAvatarUrl = () => {
    // WHY: fallback ui-avatars đồng bộ với backend (tránh trỏ /assets/favicon không tồn tại)
    if (!profile.avatar_url) {
      const seed = encodeURIComponent(profile.full_name || profile.username || "D4M");
      return `https://ui-avatars.com/api/?name=${seed}&background=random&color=fff&size=256`;
    }
    return profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : API_BASE_URL + profile.avatar_url;
  };

  return (
    <div className="d4m-page min-h-screen text-white pb-12 font-sans selection:bg-blue-500">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      

      {/* CSS GLASSMORPHISM + KIM QUANG (tu tiên) */}
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .input-glass { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.05); color: white; transition: border-color 0.3s, background 0.3s; }
        .input-glass:focus { background: rgba(15, 23, 42, 0.5); border-color: rgba(245, 193, 92, 0.5); outline: none; }
        .x-gold-text { background: linear-gradient(90deg,#ffe9a8,#f5c15c 45%,#d99a2b); -webkit-background-clip:text; background-clip:text; color:transparent; }
      `}</style>

      {/* HEADER */}
      <header className="py-6 px-4 md:px-8 max-w-[1000px] mx-auto flex justify-between items-center sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-md border-b border-white/5">
        <Link to="/hub" className="text-gray-400 hover:text-white transition flex items-center group font-bold text-sm">
          <i className="fa-solid fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> Trở về Hub
        </Link>
        <div className="text-right">
          <div className="font-bold x-gold-text tracking-wide text-xl font-heading">HỒ SƠ ĐỊNH DANH</div>
          <div className="text-[10px] text-gray-500 tracking-widest uppercase">Đạo hồ tu tiên · Social Hub</div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {isLoadingProfile ? (
        <div className="flex flex-col items-center justify-center pt-32">
          <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
          <p className="text-gray-400 font-mono">Đang đồng bộ dữ liệu với Lõi Server...</p>
        </div>
      ) : (
        <main className="max-w-[1000px] mx-auto px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          {/* CỘT TRÁI (AVATAR VÀ MENU TAB) */}
          <div className="space-y-6">
            
            {/* AVATAR CARD */}
            <div className="glass-panel p-6 rounded-3xl text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div
                className={`relative inline-block group cursor-pointer py-3 ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => document.getElementById("avatarUpload").click()}
                title="Bấm để đổi ảnh đại diện"
              >
                {/* 🖼️ Avatar + khung viền + linh thú/bảo/pháp tướng... đang trang bị */}
                <AvatarFrame
                  src={getAvatarUrl()}
                  frame={spirit.byId?.get(spirit.equipped.frame) || spirit.equipped.frame || null}
                  pet={spirit.byId?.get(spirit.equipped.pet) || null}
                  treasure={spirit.byId?.get(spirit.equipped.treasure) || null}
                  dharma={spirit.byId?.get(spirit.equipped.dharma) || null}
                  title={spirit.byId?.get(spirit.equipped.title) || null}
                  ring={spirit.byId?.get(spirit.equipped.ring) || null}
                  sect={spirit.byId?.get(spirit.equipped.sect) || null}
                  size={116}
                  alt="Profile Avatar"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fa-solid fa-camera text-2xl text-white mb-1 drop-shadow-lg"></i>
                  <span className="text-[10px] font-bold drop-shadow-lg">Đổi ảnh</span>
                </div>
                <input
                  type="file"
                  id="avatarUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </div>
              
              <h3 className="text-xl font-black mt-4 text-white">
                {profile.full_name || profile.username}
              </h3>
              <p className="text-sm text-gray-400 font-mono mt-1">
                @{profile.username}
              </p>
              
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-1.5 rounded-full text-xs font-bold shadow-inner">
                  <i className="fa-solid fa-shield-check mr-1.5"></i> Đã định danh hệ thống
                </span>
                <span className="inline-flex items-center bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-1.5 rounded-full text-xs font-bold shadow-inner">
                  🪙 {Number(spirit.xu || 0).toLocaleString("vi-VN")} Xu
                </span>
              </div>

              {/* 🎖️ Các slot trang bị đang đeo */}
              {spirit.slots?.some((s) => s.item) && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {spirit.slots.filter((s) => s.item).map((s) => (
                    <span key={s.kind} title={`${s.label}: ${s.item.name}`}
                      className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-gray-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                      {s.icon} {s.item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* TAB MENU */}
            <div className="glass-panel p-2 rounded-3xl flex flex-col space-y-1 shadow-xl">
              <button
                onClick={() => setActiveTab("basic")}
                className={`text-left px-5 py-3.5 rounded-2xl font-bold transition flex items-center ${
                  activeTab === "basic"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <i className="fa-solid fa-user-pen w-6 text-center mr-1"></i> Hồ sơ cá nhân
              </button>
              <button
                onClick={() => setActiveTab("spirit")}
                className={`text-left px-5 py-3.5 rounded-2xl font-bold transition flex items-center ${
                  activeTab === "spirit"
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <i className="fa-solid fa-wand-magic-sparkles w-6 text-center mr-1"></i> Khung & Trang bị
              </button>
              <button
                onClick={() => { setActiveTab("email"); setEmailStep(1); }}
                className={`text-left px-5 py-3.5 rounded-2xl font-bold transition flex items-center ${
                  activeTab === "email"
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/10"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <i className="fa-solid fa-envelope w-6 text-center mr-1"></i> Quản lý Email
              </button>
            </div>
          </div>

          {/* CỘT PHẢI (NỘI DUNG FORM) */}
          <div className="md:col-span-2">
            
            {/* VÙNG THÔNG TIN CƠ BẢN */}
            {activeTab === "basic" && (
              <div className="glass-panel p-8 rounded-3xl shadow-2xl animate-fade-in">
                <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white">
                  Thông Tin Cơ Bản
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        Họ và Tên
                      </label>
                      <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full px-4 py-3.5 input-glass rounded-xl text-sm"
                        placeholder="Ví dụ: Lý Thừa Ân"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        Số Điện Thoại
                      </label>
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full px-4 py-3.5 input-glass rounded-xl text-sm"
                        placeholder="09xxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        CCCD / Mã Định Danh
                      </label>
                      <input
                        type="text"
                        value={profile.cccd}
                        onChange={(e) => setProfile({ ...profile, cccd: e.target.value })}
                        className="w-full px-4 py-3.5 input-glass rounded-xl text-sm"
                        placeholder="Số Căn cước công dân"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                        Ngày Sinh
                      </label>
                      <input
                        type="date"
                        value={profile.dob}
                        onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                        className="w-full px-4 py-3.5 input-glass rounded-xl text-sm text-gray-300 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                      Email Liên Kết (Đã bảo mật)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-3.5 bg-black/40 border border-white/5 rounded-xl text-gray-500 cursor-not-allowed text-sm"
                      />
                      <i className="fa-solid fa-lock absolute right-4 top-4 text-gray-600"></i>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                      Địa Chỉ Thường Trú
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full px-4 py-3.5 input-glass rounded-xl text-sm"
                      placeholder="Nhập địa chỉ lưu trú của sếp..."
                    />
                  </div>

                  <div className="pt-4 text-right">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-black rounded-xl font-bold transition shadow-[0_0_20px_rgba(245,193,92,0.35)] active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i>Đang Cập Nhật</>
                      ) : (
                        <><i className="fa-solid fa-floppy-disk mr-2"></i>Lưu Thay Đổi</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 🖼️ VÙNG KHUNG & TRANG BỊ (Spirit v2) */}
            {activeTab === "spirit" && (
              <div className="glass-panel p-8 rounded-3xl shadow-2xl animate-fade-in border-t-4 border-t-emerald-500">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-bold text-white">Khung & Trang Bị</h2>
                  <Link to="/social/social-hub" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition">
                    Mở Social Hub để mua thêm <i className="fa-solid fa-arrow-right ml-1"></i>
                  </Link>
                </div>

                {/* 7 SLOT — tổng quan trang bị đang đeo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {(spirit.slots || SLOT_META.map((s) => ({ ...s, item: null }))).map((s) => (
                    <div key={s.kind} className={`rounded-2xl border p-3 text-center transition ${s.item ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-black/20"}`}>
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</div>
                      {s.item ? (
                        <>
                          <img src={s.item.image?.startsWith("http") ? s.item.image : API_BASE_URL + s.item.image}
                            alt={s.item.name} loading="lazy" decoding="async"
                            className="w-14 h-14 mx-auto mt-2 object-contain rounded-full bg-white/5 border border-white/10" />
                          <div className="text-xs font-bold text-white mt-1.5 truncate" title={s.item.name}>{s.item.name}</div>
                          <button onClick={() => toggleEquipFrame(s.item)} disabled={!!spiritBusy}
                            className="mt-2 w-full py-1 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 hover:bg-rose-500/20 hover:text-rose-300 transition disabled:opacity-50">
                            Tháo ra
                          </button>
                        </>
                      ) : (
                        <div className="mt-2 py-4 text-[11px] text-gray-600">Chưa trang bị</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 🖼️ KHO KHUNG VIỀN */}
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Kho khung viền của bạn ({(spirit.ownedFrames || []).length}/{(spirit.frames || []).length})
                </h3>
                {(spirit.ownedFrames || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-8 text-center">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-sm text-gray-400">Bạn chưa sở hữu khung viền nào.</p>
                    <p className="text-xs text-gray-600 mt-1">Vào Social Hub → Hồ sơ & Phong cách để mua bằng Xu ({(spirit.frames || []).length} mẫu đang có).</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {(spirit.ownedFrames || []).map((f) => {
                      const isEq = spirit.equipped.frame === f.id;
                      const busy = spiritBusy === f.id;
                      return (
                        <div key={f.id} className={`rounded-2xl border-2 p-2 text-center transition ${isEq ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-black/20 hover:border-white/30"}`}>
                          <img src={f.image?.startsWith("http") ? f.image : API_BASE_URL + f.image}
                            alt={f.name} loading="lazy" decoding="async"
                            className="w-16 h-16 mx-auto object-contain rounded-full bg-white/5 border border-white/10" />
                          <div className="text-[10px] font-bold text-gray-300 mt-1 truncate" title={f.name}>{f.name}</div>
                          <button onClick={() => toggleEquipFrame(f)} disabled={busy}
                            className={`mt-1.5 w-full py-1 rounded-full text-[10px] font-bold transition disabled:opacity-50 ${isEq ? "bg-white/10 text-gray-300 hover:bg-rose-500/20 hover:text-rose-300" : "bg-emerald-500 text-black hover:brightness-110"}`}>
                            {busy ? "..." : isEq ? "Tháo" : "Đeo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VÙNG ĐỔI ĐỊA CHỈ EMAIL */}
            {activeTab === "email" && (
              <div className="glass-panel p-8 rounded-3xl shadow-2xl animate-fade-in border-t-4 border-t-purple-500">
                <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4 text-white">
                  Chuyển Đổi Địa Chỉ Email
                </h2>

                {/* BƯỚC 1: YÊU CẦU ĐỔI EMAIL */}
                {emailStep === 1 && (
                  <div className="animate-fade-in">
                    <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-6">
                      <p className="text-sm text-purple-200">
                        <i className="fa-solid fa-circle-info mr-2"></i>
                        Hệ thống sẽ gửi một <strong>mã OTP gồm 6 số</strong> vào Email mới để xác nhận quyền sở hữu.
                      </p>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                          Địa chỉ Email Mới
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full px-4 py-3.5 input-glass rounded-xl text-sm"
                          placeholder="sothanthanh@example.com"
                        />
                      </div>
                      <button
                        onClick={requestEmailOTP}
                        disabled={isEmailLoading}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition shadow-lg active:scale-95 disabled:opacity-50 text-sm"
                      >
                        {isEmailLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Bắn Mã OTP Kích Hoạt"}
                      </button>
                    </div>
                  </div>
                )}

                {/* BƯỚC 2: NHẬP MÃ OTP */}
                {emailStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center shadow-inner">
                      <i className="fa-regular fa-paper-plane text-3xl text-emerald-400 mb-3"></i>
                      <p className="text-sm text-emerald-200">
                        Đã bắn mã OTP thành công đến <br/>
                        <span className="font-bold text-white text-base bg-black/30 px-3 py-1 rounded inline-block mt-2">{newEmail}</span>
                      </p>
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        maxLength="6"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full px-4 py-5 bg-black/50 border border-emerald-500/30 rounded-2xl text-center text-3xl tracking-[0.7em] font-mono text-white focus:outline-none focus:border-emerald-400 shadow-inner"
                      />
                    </div>

                    <button
                      onClick={verifyEmailOTP}
                      disabled={isEmailLoading || emailOtp.length < 6}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black uppercase tracking-widest transition shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEmailLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Xác Nhận & Đổi Email"}
                    </button>
                    
                    <button
                      onClick={() => setEmailStep(1)}
                      className="w-full py-2 text-xs text-gray-400 hover:text-white underline mt-2"
                    >
                      Nhập sai Email? Quay lại nhập lại
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      )}
    </div>
  );
}