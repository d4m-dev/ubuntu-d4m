// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../config/api";
import { showToast } from "../lib/toast";

export default function AuthPage() {
  const navigate = useNavigate();

  // 🚀 QUẢN LÝ LUỒNG GIAO DIỆN: 'login' | 'register' | 'forgot'
  const [view, setView] = useState("login");

  // ==========================================
  // STATE: ĐĂNG NHẬP
  // ==========================================
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  // ==========================================
  // STATE: ĐĂNG KÝ (WIZARD 3 BƯỚC)
  // ==========================================
  const [regStep, setRegStep] = useState(1); // 1: Thông tin, 2: Tài khoản, 3: OTP
  const [regData, setRegData] = useState({
    fullName: "",
    email: "",
    phone: "", // Không bắt buộc
    username: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  // ==========================================
  // STATE: QUÊN MẬT KHẨU (WIZARD 2 BƯỚC)
  // ==========================================
  const [forgotStep, setForgotStep] = useState(1); // 1: Nhập Email, 2: Nhập OTP & Pass mới
  const [forgotData, setForgotData] = useState({
    email: "",
    otp: "",
    newPassword: "",
  });

  // UI feedback states
  const [loading, setLoading] = useState(false);




  // HÀM KIỂM TRA ĐỊNH DẠNG EMAIL
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ==========================================
  // 🔑 XỬ LÝ ĐĂNG NHẬP
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        localStorage.setItem("d4m_sso_token", data.access_token);
        localStorage.setItem("d4m_token", data.access_token);
        window.dispatchEvent(new Event("d4m_auth_change"));
        
        showToast("Xác thực thành công! Đang tiến vào Trạm Hub...");
        setTimeout(() => navigate("/hub"), 800);
      } else {
        showToast(data.detail || data.message || "Sai thông tin đăng nhập!", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ API D4M!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 📝 XỬ LÝ ĐĂNG KÝ (MULTI-STEP WIZARD)
  // ==========================================
  const handleRegNextStep1 = () => {
    if (!regData.fullName.trim()) return showToast("Vui lòng nhập Họ và Tên", "error");
    if (!isValidEmail(regData.email)) return showToast("Định dạng Email không hợp lệ", "error");
    setRegStep(2);
  };

  const handleRegNextStep2 = async () => {
    if (!regData.username.trim()) return showToast("Vui lòng nhập Tên đăng nhập", "error");
    if (regData.password.length < 6) return showToast("Mật khẩu phải từ 6 ký tự", "error");
    if (regData.password !== regData.confirmPassword) return showToast("Mật khẩu xác nhận không khớp", "error");

    setLoading(true);
    try {
      // Bắn API Register để kiểm tra User/Email tồn tại và nhận mã OTP
      const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regData.username,
          password: regData.password,
          email: regData.email,
          full_name: regData.fullName,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Hợp lệ! Đã gửi mã OTP đến Email của sếp.");
        setRegStep(3); // Chuyển sang bước nhập OTP
      } else {
        // Nếu Backend báo lỗi trùng lặp, chặn lại ở Bước 2
        showToast(data.detail || data.message || "Tài khoản hoặc Email đã tồn tại!", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối tới máy chủ API!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    if (regData.otp.length < 6) return showToast("Vui lòng nhập đủ 6 số OTP", "error");
    
    setLoading(true);
    try {
      const res = await fetch(ENDPOINTS.AUTH.VERIFY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regData.email, otp: regData.otp }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Khởi tạo định danh thành công! Vui lòng đăng nhập.");
        setTimeout(() => {
          setView("login");
          setRegStep(1);
          setRegData({ fullName: "", email: "", phone: "", username: "", password: "", confirmPassword: "", otp: "" });
        }, 2000);
      } else {
        showToast(data.detail || data.message || "Mã OTP không hợp lệ!", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối tới máy chủ API!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🔄 XỬ LÝ QUÊN MẬT KHẨU (MULTI-STEP WIZARD)
  // ==========================================
  const handleForgotNextStep1 = async () => {
    if (!isValidEmail(forgotData.email)) return showToast("Định dạng Email không hợp lệ", "error");

    setLoading(true);
    try {
      const res = await fetch(ENDPOINTS.AUTH.FORGOT_REQ, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotData.email }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Đã gửi mã khôi phục! Sếp check Email nhé.");
        setForgotStep(2);
      } else {
        showToast(data.detail || data.message || "Email không tồn tại trong hệ thống", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (forgotData.otp.length < 6) return showToast("Vui lòng nhập đủ 6 số OTP", "error");
    if (forgotData.newPassword.length < 6) return showToast("Mật khẩu mới phải từ 6 ký tự", "error");

    setLoading(true);
    try {
      const res = await fetch(ENDPOINTS.AUTH.FORGOT_RESET, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotData.email, otp: forgotData.otp, new_password: forgotData.newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Khôi phục thành công! Đăng nhập ngay thôi.");
        setTimeout(() => {
          setView("login");
          setForgotStep(1);
          setForgotData({ email: "", otp: "", newPassword: "" });
        }, 1500);
      } else {
        showToast(data.detail || data.message || "Mã OTP sai hoặc hết hạn", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COMPONENT ĐIỀU HƯỚNG BƯỚC (STEPPER)
  // ==========================================
  const ProgressBar = ({ currentStep, totalSteps, labels }) => {
    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    return (
      <div className="mb-8 relative px-2">
        <div className="absolute left-0 top-3.5 w-full h-1 bg-white/10 rounded-full z-0"></div>
        <div className="absolute left-0 top-3.5 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full z-0 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        <div className="relative z-10 flex justify-between">
          {labels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum <= currentStep;
            return (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${isActive ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "bg-slate-800 text-gray-500 border border-white/10"}`}>
                  {stepNum < currentStep ? <i className="fa-solid fa-check"></i> : stepNum}
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-widest ${isActive ? "text-blue-300" : "text-gray-500"}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="d4m-page min-h-screen flex flex-col justify-center items-center px-4 relative text-slate-50 overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />


      {/* KHÔNG GIAN NỀN CYBERPUNK */}
      <div className="cyber-grid" aria-hidden="true"></div>
      <div className="orb orb-1" aria-hidden="true"></div>
      <div className="orb orb-2" aria-hidden="true"></div>

      {/* NÚT QUAY LẠI TRANG CHỦ */}
      <Link to="/" aria-label="Quay lại Trang Chủ" className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md z-20">
        <i className="fa-solid fa-arrow-left"></i><span className="hidden sm:inline">Quay lại Trang Chủ</span>
      </Link>

      <div className="w-full max-w-md glass-card p-8 md:p-10 rounded-3xl relative z-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        
        {/* ======================================================== */}
        {/* VIEW: LOGIN */}
        {/* ======================================================== */}
        {view === "login" && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(139,92,246,0.5)] border border-white/20">
                <i className="fa-solid fa-fingerprint text-white text-2xl"></i>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight text-white">CỔNG ĐỊNH DANH</h1>
              <p className="text-xs text-gray-400 font-mono mt-1 uppercase tracking-widest">Aegis Secured Access</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="auth-login-username" className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Tên Đăng Nhập</label>
                <div className="relative">
                  <i className="fa-solid fa-user-shield absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                  <input id="auth-login-username" type="text" required autoComplete="username" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} placeholder="Nhập tài khoản SSO" className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="auth-login-password" className="block text-xs font-bold text-gray-400 uppercase font-mono">Mật Khẩu</label>
                  <button type="button" onClick={() => { setView("forgot"); setForgotStep(1); }} className="text-xs text-blue-400 hover:text-blue-300 transition">Quên mật khẩu?</button>
                </div>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                  <input id="auth-login-password" type="password" required autoComplete="current-password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} placeholder="••••••••••••" className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-glow-master mt-4 py-4 text-white font-bold rounded-xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {loading ? <i className="fa-solid fa-circle-notch animate-spin text-base"></i> : <i className="fa-solid fa-arrow-right-to-bracket text-base"></i>}
                <span>{loading ? "ĐANG TRUY CẬP..." : "XÁC THỰC VÀO TRẠM"}</span>
              </button>
            </form>
            <div className="mt-8 text-center text-sm text-gray-400">
              Người dùng mới? <button onClick={() => { setView("register"); setRegStep(1); }} className="text-purple-400 font-bold hover:underline ml-1">Đăng ký D4M ID</button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: REGISTER (WIZARD 3 BƯỚC) */}
        {/* ======================================================== */}
        {view === "register" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-heading font-black text-center mb-6">TẠO ĐỊNH DANH MỚI</h1>
            <ProgressBar currentStep={regStep} totalSteps={3} labels={["Cá Nhân", "Tài Khoản", "Xác Thực"]} />

            {/* BƯỚC 1: CÁ NHÂN & LIÊN HỆ */}
            {regStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Họ và Tên <span className="text-red-500">*</span></label>
                  <input type="text" value={regData.fullName} onChange={(e) => setRegData({...regData, fullName: e.target.value})} placeholder="Ví dụ: Nguyễn Văn A" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={regData.email} onChange={(e) => setRegData({...regData, email: e.target.value})} placeholder="admin@d4mdev.click" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Số Điện Thoại (Không bắt buộc)</label>
                  <input type="tel" value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} placeholder="09xxxxxxxx" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <button onClick={handleRegNextStep1} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 py-3.5 rounded-xl font-bold uppercase tracking-widest mt-2 transition">Tiếp Tục <i className="fa-solid fa-arrow-right ml-1"></i></button>
              </div>
            )}

            {/* BƯỚC 2: TÀI KHOẢN BẢO MẬT */}
            {regStep === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Tên Đăng Nhập <span className="text-red-500">*</span></label>
                  <input type="text" value={regData.username} onChange={(e) => setRegData({...regData, username: e.target.value})} placeholder="Tối thiểu 4 ký tự viết liền" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Mật Khẩu <span className="text-red-500">*</span></label>
                  <input type="password" value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} placeholder="Tối thiểu 6 ký tự" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 font-mono">Xác Nhận Mật Khẩu <span className="text-red-500">*</span></label>
                  <input type="password" value={regData.confirmPassword} onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})} placeholder="Nhập lại mật khẩu" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setRegStep(1)} className="w-1/3 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition">Quay Lại</button>
                  <button onClick={handleRegNextStep2} disabled={loading} className="w-2/3 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Nhận Mã OTP"}
                  </button>
                </div>
              </div>
            )}

            {/* BƯỚC 3: NHẬP OTP */}
            {regStep === 3 && (
              <form onSubmit={handleRegSubmit} className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3"><i className="fa-solid fa-envelope-open-text text-blue-400 text-lg"></i></div>
                  <p className="text-sm text-gray-400 leading-relaxed">Mã bảo mật đã được gửi đến<br/><strong className="text-white bg-black/40 px-2 py-1 rounded inline-block mt-1">{regData.email}</strong></p>
                </div>
                <input type="text" maxLength="6" required value={regData.otp} onChange={(e) => setRegData({...regData, otp: e.target.value.replace(/[^0-9]/g, '')})} placeholder="MÃ OTP (6 SỐ)" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-4 text-center text-xl tracking-[0.5em] font-mono font-bold text-white focus:outline-none focus:border-blue-500 transition shadow-inner" />
                <button type="submit" disabled={loading || regData.otp.length < 6} className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl font-bold uppercase tracking-widest transition shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "KÍCH HOẠT ĐỊNH DANH"}
                </button>
              </form>
            )}

            <div className="mt-8 pt-4 border-t border-white/10 text-center text-sm text-gray-400">
              Đã có tước vị? <button onClick={() => setView("login")} className="text-blue-400 font-bold hover:underline ml-1">Quay về đăng nhập</button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW: FORGOT PASSWORD (WIZARD 2 BƯỚC) */}
        {/* ======================================================== */}
        {view === "forgot" && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-heading font-black text-center mb-6">KHÔI PHỤC MẬT KHẨU</h1>
            <ProgressBar currentStep={forgotStep} totalSteps={2} labels={["Nhập Email", "Đặt Lại Mật Khẩu"]} />

            {/* BƯỚC 1: NHẬP EMAIL */}
            {forgotStep === 1 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-400 text-center mb-6">Nhập Email sếp đã đăng ký, hệ thống sẽ bắn một mã OTP khôi phục quyền truy cập.</p>
                <div>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                    <input type="email" required value={forgotData.email} onChange={(e) => setForgotData({...forgotData, email: e.target.value})} placeholder="Địa chỉ Email" className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500 transition shadow-inner" />
                  </div>
                </div>
                <button onClick={handleForgotNextStep1} disabled={loading} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 mt-2 py-4 rounded-xl font-bold uppercase tracking-widest flex justify-center items-center transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "BẮN MÃ KHÔI PHỤC"}
                </button>
              </div>
            )}

            {/* BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI */}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotSubmit} className="space-y-4 animate-fade-in">
                <p className="text-sm text-gray-400 text-center mb-4">Mã OTP đã được gửi đến: <br/><strong className="text-white">{forgotData.email}</strong></p>
                <div>
                  <input type="text" maxLength="6" required value={forgotData.otp} onChange={(e) => setForgotData({...forgotData, otp: e.target.value.replace(/[^0-9]/g, '')})} placeholder="NHẬP 6 SỐ OTP" className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-purple-500 transition shadow-inner" />
                </div>
                <div>
                  <div className="relative mt-2">
                    <i className="fa-solid fa-key absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                    <input type="password" minLength="6" required value={forgotData.newPassword} onChange={(e) => setForgotData({...forgotData, newPassword: e.target.value})} placeholder="Mật khẩu mới (Tối thiểu 6 ký tự)" className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-purple-500 transition shadow-inner" />
                  </div>
                </div>
                <button type="submit" disabled={loading || forgotData.otp.length < 6} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-4 mt-2 rounded-xl font-bold uppercase tracking-widest shadow-lg flex justify-center items-center transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "LƯU MẬT KHẨU MỚI"}
                </button>
              </form>
            )}

            <div className="mt-8 pt-4 border-t border-white/10 text-center text-sm text-gray-400">
              <button onClick={() => { setView("login"); setForgotStep(1); }} className="text-blue-400 font-bold hover:underline"><i className="fa-solid fa-arrow-left mr-1"></i> Quay về đăng nhập</button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER MINI */}
      <div className="mt-8 text-center text-[11px] text-gray-400 font-mono">
        D4M CLOUD WORKSPACE &copy; 2026 | SECURED BY AEGIS SHIELD
      </div>
    </div>
  );
}