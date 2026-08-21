// src/components/donate/DonateModal.jsx
// 💰 DonateModal — Popup donate & tự động kích hoạt tài khoản (SePay realtime).
//    BẢN RESPONSIVE + ICON INLINE (không phụ thuộc CDN Font Awesome)
//    + POLLING fallback khi WebSocket bị chặn (proxy/tunnel).
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { DONATE } from "../../config/urls";
import { getToken, getUser, setUser } from "../../api/client";
import { showToast } from "../../lib/toast";

const QR_TTL_SECONDS = 15 * 60; // 15 phút

// ---------- 🎨 Icon SVG inline (nhẹ, không cần CDN) ----------
const I = {
  close: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  heart: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21s-7.5-4.9-10-9.2C.4 8.6 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.6C10.9 6.1 12.3 5 14.3 5c3.4 0 5.3 3.6 3.7 6.8C19.5 16.1 12 21 12 21z" /></svg>,
  qr: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-3 0h2v2h-2v-2zm3 3h2v2h-2v-2zm2 2h3v3h-3v-3zm-5 0h2v3h-2v-3z" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>,
  spin: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="d4m-rot"><path d="M21 12a9 9 0 1 1-9-9" /></svg>,
  check: <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.5 5.5L20 6.5" /></svg>,
  rocket: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2c4 2 6 6 6 10l3 3-4 1-2 4-2-3c-1 .3-2 .3-3 0l-2 3-2-4-4-1 3-3c0-4 2-8 7-10z" /></svg>,
  music: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 3v10.6A3.5 3.5 0 1 0 11 17V7h8v6.6A3.5 3.5 0 1 0 21 17V3H9z" /></svg>,
  robot: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2v1h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5V4a2 2 0 0 1 2-2zM8.5 11A1.5 1.5 0 1 0 10 12.5 1.5 1.5 0 0 0 8.5 11zm7 0A1.5 1.5 0 1 0 17 12.5 1.5 1.5 0 0 0 15.5 11z" /></svg>,
  folder: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /></svg>,
  wand: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 21l12-12 2 2L5 23H3v-2zM17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zm-6 2l.7 1.4L13 7l-1.3.6L11 9l-.7-1.4L9 7l1.3-.6L11 5zm8 6l.7 1.4L21 11l-1.3.6L19 13l-.7-1.4L17 11l1.3-.6L19 11z" /></svg>,
};

export default function DonateModal({ open, onClose }) {
  const [step, setStep] = useState(1);          // 1 | 2 | 3
  const [amount, setAmount] = useState(50000);
  const [qrUrl, setQrUrl] = useState("");
  const [qrId, setQrId] = useState("");
  const [ttlLeft, setTtlLeft] = useState(QR_TTL_SECONDS);
  const [loadingQr, setLoadingQr] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const wsRef = useRef(null);
  const ttlTimerRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [confetti, setConfetti] = useState(false);

  const resolveUserId = useCallback(() => {
    const stored = getUser();
    if (stored && stored.id) return stored.id;
    const token = getToken();
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(
          decodeURIComponent(
            atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
          )
        );
        return payload.id || payload.user_id || (Number.isInteger(+payload.sub) ? +payload.sub : null);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Reset khi mở
  useEffect(() => {
    if (open) {
      setStep(1);
      setQrUrl("");
      setQrId("");
      setTtlLeft(QR_TTL_SECONDS);
      setConfetti(false);
      setPaidAmount(0);
      setUserId(resolveUserId());
    }
  }, [open, resolveUserId]);

  const refreshUserActive = useCallback(() => {
    const stored = getUser();
    if (stored) setUser({ ...stored, active: 1 });
    window.dispatchEvent(new CustomEvent("d4m:user-activated"));
  }, []);

  // 🎉 Dùng chung khi nhận tiền (WS hoặc polling)
  const onPaid = useCallback((amt) => {
    setPaidAmount(amt);
    showToast(`🎉 Cảm ơn sếp đã donate ${Number(amt).toLocaleString("vi-VN")}đ! Tài khoản đã được kích hoạt.`);
    setConfetti(true);
    setStep(3);
    refreshUserActive();
    clearInterval(ttlTimerRef.current);
  }, [refreshUserActive]);

  // Đếm ngược 15 phút khi ở màn 2
  useEffect(() => {
    if (step !== 2) return;
    setTtlLeft(QR_TTL_SECONDS);
    ttlTimerRef.current = setInterval(() => {
      setTtlLeft((prev) => (prev <= 1 ? (clearInterval(ttlTimerRef.current), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(ttlTimerRef.current);
  }, [step]);

  // Hết giờ -> toast + về màn 1
  useEffect(() => {
    if (step === 2 && ttlLeft <= 0) {
      showToast("Mã QR đã hết hạn (15 phút). Vui lòng tạo mã mới!", "warning");
      setStep(1);
      setQrUrl("");
      setQrId("");
    }
  }, [ttlLeft, step]);

  // ---- Màn 1: tạo mã QR ----
  const handleCreateQR = async () => {
    if (amount < 10000) {
      showToast("Số tiền tối thiểu là 10.000đ!", "error");
      return;
    }
    const uid = userId ?? resolveUserId();
    if (!uid) {
      showToast("Vui lòng đăng nhập trước khi donate!", "error");
      return;
    }
    setLoadingQr(true);
    try {
      const res = await fetch(DONATE.QR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lỗi tạo mã QR");
      setQrUrl(data.qr_url);
      setQrId(data.qr_id);
      setUserId(uid);
      setStep(2);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoadingQr(false);
    }
  };

  // ---- Màn 2: WebSocket + POLLING fallback ----
  useEffect(() => {
    if (step !== 2 || !userId) return;
    let ws;
    try {
      ws = new WebSocket(DONATE.WS(userId));
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.status === "success") onPaid(msg.amount || amount);
        } catch { /* ping/pong */ }
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch { /* WS bị chặn → đã có polling */ }

    const ping = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25000);

    // 🔎 Polling mỗi 5s — hoạt động cả khi WS chết (proxy/tunnel chặn WS)
    const poll = setInterval(async () => {
      if (!qrId) return;
      try {
        const r = await fetch(DONATE.STATUS(qrId));
        if (!r.ok) return;
        const d = await r.json();
        if (d.qr_status === "paid") onPaid(d.amount || amount);
        else if (d.qr_status === "expired") setTtlLeft(0);
      } catch { /* mạng lỗi thoáng qua */ }
    }, 5000);

    return () => {
      clearInterval(ping);
      clearInterval(poll);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [step, userId, qrId, amount, onPaid]);

  // Dọn khi unmount
  useEffect(() => () => {
    clearInterval(ttlTimerRef.current);
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  }, []);

  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];
  const fmtTtl = () => `${String(Math.floor(ttlLeft / 60)).padStart(2, "0")}:${String(ttlLeft % 60).padStart(2, "0")}`;

  if (!open) return null;

  // 🌀 Portal ra body: thoát mọi ancestor có backdrop-filter/transform
  // (navbar kính mờ, sidebar...) — fixed bám viewport thật, không bay lên đỉnh.
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", overflowY: "auto",
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
        padding: "clamp(.5rem, 3vw, 1.25rem)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="d4m-card"
        style={{
          width: "100%", maxWidth: 440,
          maxHeight: "92dvh", overflowY: "auto",
          margin: "auto",
          padding: "clamp(1rem, 4.5vw, 1.75rem)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          className="d4m-back"
          style={{ position: "sticky", top: 0, float: "right", width: 34, height: 34, zIndex: 2 }}
          aria-label="Đóng"
        >
          {I.close}
        </button>

        {/* ===== MÀN 1: CHỌN SỐ TIỀN ===== */}
        {step === 1 && (
          <div>
            <div className="text-center mb-4" style={{ clear: "both" }}>
              <div className="d4m-badge" style={{ margin: "0 auto 1rem" }}>{I.heart} ỦNG HỘ</div>
              <h2 className="d4m-page-title" style={{ fontSize: "clamp(1.15rem, 4.5vw, 1.4rem)", display: "block" }}>
                Donate & Kích hoạt tài khoản
              </h2>
              <p className="d4m-page-subtitle">
                Ủng hộ để hệ thống phát triển & tự động mở khóa toàn bộ tính năng.
              </p>
            </div>

            <div className="d4m-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))", gap: ".5rem", marginBottom: "1rem" }}>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  className="d4m-btn"
                  onClick={() => setAmount(q)}
                  style={{
                    padding: ".6rem .25rem", fontSize: "clamp(.68rem, 2.6vw, .8rem)",
                    borderColor: amount === q ? "var(--d4m-primary)" : undefined,
                    background: amount === q ? "rgba(59,130,246,.15)" : undefined,
                  }}
                >
                  {q.toLocaleString("vi-VN")}đ
                </button>
              ))}
            </div>

            <div className="d4m-field">
              <label className="d4m-label">Số tiền (VNĐ)</label>
              <input
                type="number"
                className="d4m-input"
                value={amount}
                min={10000}
                step={1000}
                inputMode="numeric"
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
              <p className="d4m-page-subtitle" style={{ fontSize: ".75rem", marginTop: ".35rem" }}>
                Tối thiểu 10.000đ • Mã QR có hiệu lực 15 phút
              </p>
            </div>

            <button
              className="d4m-btn d4m-btn-primary w-full"
              onClick={handleCreateQR}
              disabled={loadingQr}
              style={{ width: "100%", padding: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
            >
              {loadingQr ? <>{I.spin} Tạo mã QR...</> : <>{I.qr} Tạo mã QR</>}
            </button>
          </div>
        )}

        {/* ===== MÀN 2: QR + ĐẾM NGƯỢC + CHỜ ===== */}
        {step === 2 && (
          <div className="text-center" style={{ clear: "both" }}>
            <h2 className="d4m-page-title" style={{ fontSize: "clamp(1.1rem, 4.3vw, 1.3rem)", display: "block" }}>
              Quét mã QR để thanh toán
            </h2>
            <p className="d4m-page-subtitle" style={{ wordBreak: "break-word" }}>
              Chuyển khoản <strong>{amount.toLocaleString("vi-VN")}đ</strong> • Nội dung <strong>D4M {userId}</strong>
            </p>

            <div
              className="d4m-badge mx-auto mt-3"
              style={{
                display: "inline-flex",
                background: ttlLeft <= 60 ? "rgba(244,63,94,.15)" : "rgba(250,204,21,.12)",
                borderColor: ttlLeft <= 60 ? "rgba(244,63,94,.4)" : "rgba(250,204,21,.3)",
                color: ttlLeft <= 60 ? "#fca5a5" : "#fde047",
                fontSize: "clamp(.8rem, 3vw, .9rem)",
                fontFamily: "monospace",
              }}
            >
              {I.clock} {fmtTtl()}
            </div>

            <div
              className="mt-4 mb-4 mx-auto"
              style={{
                width: "min(240px, 68vw)", aspectRatio: "1 / 1",
                background: "#fff", borderRadius: 12, padding: 8, overflow: "hidden",
              }}
            >
              {qrUrl ? (
                <img src={qrUrl} alt="Mã QR donate" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div className="d4m-loading"><div className="d4m-spinner" /></div>
              )}
            </div>

            <div className="d4m-badge" style={{ background: "rgba(250,204,21,.12)", borderColor: "rgba(250,204,21,.3)", color: "#fde047" }}>
              {I.spin} Đang chờ thanh toán...
            </div>
            <p className="d4m-page-subtitle mt-2">
              Hệ thống sẽ tự động kích hoạt tài khoản ngay khi nhận được tiền.
            </p>
          </div>
        )}

        {/* ===== MÀN 3: CẢM ƠN + MỞ KHÓA ===== */}
        {step === 3 && (
          <div className="text-center" style={{ position: "relative", clear: "both" }}>
            {confetti && <ConfettiBurst />}
            <div
              className="mx-auto mb-4"
              style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 40px rgba(34,197,94,.5)",
              }}
            >
              {I.check}
            </div>
            <h2 className="d4m-page-title" style={{ fontSize: "clamp(1.15rem, 4.5vw, 1.4rem)", display: "block" }}>
              Cảm ơn sếp! 🎉
            </h2>
            <p className="d4m-page-subtitle">
              Sếp đã donate <strong style={{ color: "var(--d4m-primary)" }}>{paidAmount.toLocaleString("vi-VN")}đ</strong>. Tài khoản đã được kích hoạt!
            </p>

            <div className="d4m-card mt-4" style={{ textAlign: "left", padding: "1rem" }}>
              <p className="d4m-label" style={{ marginBottom: ".75rem" }}>✨ Đã mở khóa</p>
              <div className="d4m-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: ".5rem" }}>
                {[
                  [I.music, "D4M Music Pro"],
                  [I.robot, "J.A.R.V.I.S AI"],
                  [I.folder, "Google Drive"],
                  [I.wand, "AutoCode AI"],
                ].map(([icon, name]) => (
                  <div key={name} className="d4m-card" style={{ padding: ".6rem .75rem", display: "flex", alignItems: "center", gap: ".5rem", fontSize: "clamp(.7rem, 2.8vw, .8rem)" }}>
                    <span style={{ color: "#22c55e", display: "inline-flex" }}>{icon}</span> {name}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="d4m-btn d4m-btn-primary w-full mt-4"
              onClick={() => { setConfetti(false); onClose(); }}
              style={{ width: "100%", padding: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
            >
              {I.rocket} Bắt đầu trải nghiệm
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** 🎆 Pháo hoa CSS */
function ConfettiBurst() {
  const colors = ["#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];
  const pieces = Array.from({ length: 40 }, (_, i) => {
    const ang = (i / 40) * Math.PI * 2;
    return {
      id: i,
      left: 50 + Math.cos(ang) * 8,
      top: 50 + Math.sin(ang) * 8,
      dx: Math.cos(ang) * (60 + (i % 5) * 14),
      dy: Math.sin(ang) * (60 + (i % 5) * 14),
      color: colors[i % 6],
      delay: Math.random() * 0.3,
    };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
            width: 10, height: 10, background: p.color, borderRadius: 2,
            "--cf-x": `${p.dx}px`, "--cf-y": `${p.dy}px`,
            animation: `confetti-fly 1.5s ${p.delay}s ease-out forwards`, opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
