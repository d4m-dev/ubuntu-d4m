// src/pages/tools/JarvisChatPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ENDPOINTS } from "../../config/api";
import ConfigWarning from "../../components/common/ConfigWarning";

/**
 * J.A.R.V.I.S — AI Chat đồng bộ design system D4M.
 * Chỉ user có active = 1 mới dùng được (kiểm tra backend /api/ai-admin/chat).
 */
export default function JarvisChatPage() {
  const [authStatus, setAuthStatus] = useState({
    isAuthorized: false,
    isActive: false,
    lockTitle: "",
    lockDesc: "",
    userName: "Admin",
  });
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const parseJwt = (token) => {
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
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    if (!token) {
      setAuthStatus({
        isAuthorized: false, isActive: false,
        lockTitle: "Cần Đăng Nhập",
        lockDesc: "Sếp chưa mang thẻ định danh D4M ID.<br/>Vui lòng đăng nhập vào hệ sinh thái để tiếp tục.",
      });
      return;
    }
    token = token.replace(/^["']|["']$/g, "");
    const payload = parseJwt(token);
    if (!payload) {
      setAuthStatus({
        isAuthorized: false, isActive: false,
        lockTitle: "Lỗi Định Danh",
        lockDesc: "Thẻ D4M ID của sếp bị hỏng hoặc đã hết hạn.<br/>Vui lòng đăng xuất và đăng nhập lại.",
      });
      return;
    }
    if (Number(payload.active) !== 1) {
      setAuthStatus({
        isAuthorized: false, isActive: false,
        lockTitle: "Tài Khoản Chưa Kích Hoạt",
        lockDesc: "Tài khoản của sếp <b>chưa được kích hoạt (active = 0)</b>.<br/>Vui lòng liên hệ Admin để mở khóa đặc quyền trước khi dùng AI!",
      });
      return;
    }
    const userNameDisplay = payload.full_name || payload.sub || "Admin";
    setAuthStatus({
      isAuthorized: true, isActive: true, lockTitle: "", lockDesc: "", userName: userNameDisplay,
    });
    setMessages([
      {
        id: "init-welcome", sender: "ai",
        text: `Chào sếp ${userNameDisplay}! Tôi là J.A.R.V.I.S. Sếp cần kiểm tra trạng thái hệ thống, bật/tắt dịch vụ hay sắp xếp lịch làm việc ngày hôm nay?`,
      },
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputVal.trim();
    if (!text || isTyping) return;
    setMessages((prev) => [...prev, { id: "user-" + Date.now(), sender: "user", text }]);
    setInputVal("");
    setIsTyping(true);
    try {
      let token = localStorage.getItem("d4m_sso_token") || localStorage.getItem("d4m_token");
      token = token ? token.replace(/^["']|["']$/g, "") : "";
      const response = await fetch(ENDPOINTS.AI_ADMIN.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, {
          id: "ai-" + Date.now(), sender: "ai",
          text: data.reply || "Đã tiếp nhận yêu cầu từ sếp.",
          actionExecuted: data.action_executed || null,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: "error-" + Date.now(), sender: "ai",
          text: `❌ Lỗi: ${data.detail || "Không thể thực thi lệnh"}`,
          isError: true,
        }]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: "net-error-" + Date.now(), sender: "ai",
        text: "❌ Mất kết nối đến Lõi máy chủ J.A.R.V.I.S.",
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ---------- MÀN HÌNH KHÓA ----------
  if (!authStatus.isAuthorized) {
    return (
      <div className="d4m-page">
        <div className="cyber-grid" aria-hidden="true" />
        <div className="orb orb-1" aria-hidden="true" />
        <div className="orb orb-2" aria-hidden="true" />
        <div className="d4m-container" style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div className="d4m-card" style={{ maxWidth: 440, padding: "2.5rem" }}>
            <div className="d4m-badge" style={{ background: "rgba(244,63,94,.12)", borderColor: "rgba(244,63,94,.3)", color: "#fda4af", marginBottom: "1.5rem" }}>
              <i className="fa-solid fa-lock" /> Yêu cầu đăng nhập
            </div>
            <h1 className="d4m-page-title" style={{ fontSize: "1.5rem", justifyContent: "center", display: "block" }}>
              {authStatus.lockTitle || "Yêu Cầu Đăng Nhập"}
            </h1>
            <p
              className="mt-4 mb-6"
              style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: authStatus.lockDesc || "Bạn không có quyền sử dụng tính năng này!" }}
            />
            <Link to="/auth?redirect=/tools/jarvis-chat" className="d4m-btn d4m-btn-primary">
              <i className="fa-solid fa-fingerprint text-lg" /> <span>Đăng nhập D4M ID</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- GIAO DIỆN CHÍNH ----------
  return (
    <div className="d4m-page">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="d4m-container" style={{ maxWidth: 900, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <ConfigWarning
          serviceKey="gemini"
          message="Thêm GEMINI_API_KEY vào backend/.env để J.A.R.V.I.S có thể trả lời. Xem README mục cấu hình."
        />

        {/* HEADER */}
        <div className="d4m-page-header">
          <Link to="/hub" className="d4m-back" aria-label="Quay lại Hub" title="Về Hub">
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <div style={{ flex: 1 }}>
            <h1 className="d4m-page-title">
              <i className="fa-solid fa-microchip mr-2" /> J.A.R.V.I.S
            </h1>
            <p className="d4m-page-subtitle" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
              System Online — {authStatus.userName}
            </p>
          </div>
        </div>

        {/* CHAT BOX */}
        <div className="d4m-card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 520, padding: 0, overflow: "hidden" }}>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style={{ minHeight: 460 }}>
            {messages.map((msg) => {
              if (msg.sender === "user") {
                return (
                  <div key={msg.id} className="self-end d4m-card" style={{ maxWidth: "85%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", padding: ".75rem 1rem", borderRadius: "1rem 1rem .25rem 1rem" }}>
                    {msg.text}
                  </div>
                );
              }
              return (
                <div key={msg.id} className="self-start d4m-card" style={{ maxWidth: "85%", padding: ".9rem 1rem", borderRadius: "1rem 1rem 1rem .25rem", borderColor: msg.isError ? "rgba(244,63,94,.5)" : "var(--d4m-border)" }}>
                  <div className="flex items-center gap-2 mb-1.5" style={{ color: msg.isError ? "#fda4af" : "#93c5fd" }}>
                    <i className="fa-solid fa-robot" /> <span style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>J.A.R.V.I.S</span>
                  </div>
                  <div className="whitespace-pre-line" style={{ color: msg.isError ? "#fda4af" : "var(--d4m-text)", fontSize: ".9rem", lineHeight: 1.6 }}>{msg.text}</div>
                  {msg.actionExecuted && (
                    <div className="mt-2 d4m-badge" style={{ background: "rgba(34,197,94,.1)", borderColor: "rgba(34,197,94,.3)", color: "#86efac" }}>
                      <i className="fa-solid fa-check-double" /> {msg.actionExecuted}
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="self-start d4m-card" style={{ padding: ".9rem 1rem", borderRadius: "1rem 1rem 1rem .25rem" }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "blink 1.4s infinite both" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "blink 1.4s .2s infinite both" }} />
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: "blink 1.4s .4s infinite both" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT */}
          <div style={{ borderTop: "1px solid var(--d4m-border)", padding: ".9rem 1rem" }}>
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isTyping}
                autoComplete="off"
                className="d4m-input w-full"
                placeholder="Nhắn lệnh (VD: kiểm tra trạng thái CPU, Tuần này làm ca A1...)"
              />
              <button
                type="submit"
                disabled={isTyping || !inputVal.trim()}
                className="d4m-btn d4m-btn-primary"
                style={{ flexShrink: 0, background: "linear-gradient(135deg,#3b82f6,#6366f1)" }}
                aria-label="Gửi"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
