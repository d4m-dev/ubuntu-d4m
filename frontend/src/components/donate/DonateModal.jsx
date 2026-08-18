// src/components/donate/DonateModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DONATE } from "../../config/urls";
import { getToken, getUser, setUser } from "../../api/client";
import { showToast } from "../../lib/toast";

const QR_TTL_SECONDS = 15 * 60; // 15 phút

/**
 * 💰 DonateModal — Popup donate & tự động kích hoạt tài khoản (SePay realtime).
 *
 *   Màn 1: Chọn số tiền (>= 10.000đ) -> "Tạo mã QR"
 *   Màn 2: Hiển thị QR + đếm ngược 15 phút + WebSocket -> "Đang chờ thanh toán..."
 *   Màn 3: Nhận success -> Toast + "Cảm ơn sếp {amount}đ!" + pháo hoa + mở khóa dịch vụ
 *
 * Khi QR hết hạn (15 phút) -> toast + quay về màn 1.
 * Khi nhận được tiền -> toast + tự chuyển sang màn 3 (fallback trang web).
 */
export default function DonateModal({ open, onClose }) {
  const [step, setStep] = useState(1);          // 1 | 2 | 3
  const [amount, setAmount] = useState(50000);
  const [qrUrl, setQrUrl] = useState("");
  const [qrId, setQrId] = useState("");
  const [ttlLeft, setTtlLeft] = useState(QR_TTL_SECONDS); // đếm ngược
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
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
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

  // Làm mới user context sau khi kích hoạt
  const refreshUserActive = useCallback(() => {
    const stored = getUser();
    if (stored) setUser({ ...stored, active: 1 });
    window.dispatchEvent(new CustomEvent("d4m:user-activated"));
  }, []);

  // Đếm ngược 15 phút khi ở màn 2
  useEffect(() => {
    if (step !== 2) return;
    setTtlLeft(QR_TTL_SECONDS);
    ttlTimerRef.current = setInterval(() => {
      setTtlLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ttlTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ttlTimerRef.current);
  }, [step]);

  // Hết giờ -> toast + về màn 1 + đóng QR
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

  // ---- Màn 2: WebSocket lắng nghe + fallback khi nhận tiền ----
  useEffect(() => {
    if (step !== 2 || !userId) return;
    const wsUrl = DONATE.WS(userId);
    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      showToast("Không thể kết nối WebSocket!", "error");
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.status === "success") {
          const amt = msg.amount || amount;
          setPaidAmount(amt);
          // 🎉 Toast cảm ơn ngay khi nhận tiền (fallback nếu đang mở nơi khác)
          showToast(`🎉 Cảm ơn sếp đã donate ${amt.toLocaleString("vi-VN")}đ! Tài khoản đã được kích hoạt.`);
          // Tự chuyển sang màn 3 cảm ơn
          setConfetti(true);
          setStep(3);
          refreshUserActive();
          clearInterval(ttlTimerRef.current);
        }
      } catch {
        // không phải JSON (ping/pong)
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {};

    // Ping giữ kết nối
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25000);

    return () => {
      clearInterval(ping);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [step, userId, amount, refreshUserActive]);

  // Dọn WS khi unmount/đóng
  useEffect(() => {
    return () => {
      clearInterval(ttlTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  // Định dạng đếm ngược mm:ss
  const fmtTtl = () => {
    const m = Math.floor(ttlLeft / 60);
    const s = ttlLeft % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="d4m-card" style={{ width: "100%", maxWidth: 440, padding: "1.75rem", position: "relative", overflow: "hidden" }}>
        <button
          onClick={onClose}
          className="d4m-back"
          style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34 }}
          aria-label="Đóng"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        {/* ===== MÀN 1: CHỌN SỐ TIỀN ===== */}
        {step === 1 && (
          <div>
            <div className="text-center mb-4">
              <div className="d4m-badge" style={{ margin: "0 auto 1rem" }}>
                <i className="fa-solid fa-heart" /> ỦNG HỘ
              </div>
              <h2 className="d4m-page-title" style={{ fontSize: "1.4rem", display: "block" }}>
                Donate & Kích hoạt tài khoản
              </h2>
              <p className="d4m-page-subtitle">
                Ủng hộ để hệ thống phát triển & tự động mở khóa toàn bộ tính năng.
              </p>
            </div>

            <div className="d4m-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: ".5rem", marginBottom: "1rem" }}>
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  className="d4m-btn"
                  onClick={() => setAmount(q)}
                  style={{
                    padding: ".6rem", fontSize: ".8rem",
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
              style={{ width: "100%", padding: ".85rem" }}
            >
              {loadingQr ? (
                <><div className="d4m-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Tạo mã QR...</>
              ) : (
                <><i className="fa-solid fa-qrcode" /> Tạo mã QR</>
              )}
            </button>
          </div>
        )}

        {/* ===== MÀN 2: QR + ĐẾM NGƯỢC + CHỜ ===== */}
        {step === 2 && (
          <div className="text-center">
            <h2 className="d4m-page-title" style={{ fontSize: "1.3rem", display: "block" }}>
              Quét mã QR để thanh toán
            </h2>
            <p className="d4m-page-subtitle">
              Chuyển khoản <strong>{amount.toLocaleString("vi-VN")}đ</strong> • Nội dung <strong>D4M {userId}</strong>
            </p>

            {/* Đếm ngược 15 phút */}
            <div
              className="d4m-badge mx-auto mt-3"
              style={{
                display: "inline-flex",
                background: ttlLeft <= 60 ? "rgba(244,63,94,.15)" : "rgba(250,204,21,.12)",
                borderColor: ttlLeft <= 60 ? "rgba(244,63,94,.4)" : "rgba(250,204,21,.3)",
                color: ttlLeft <= 60 ? "#fca5a5" : "#fde047",
                fontSize: ".9rem",
                fontFamily: "monospace",
              }}
            >
              <i className="fa-regular fa-clock" /> {fmtTtl()}
            </div>

            <div className="mt-4 mb-4 mx-auto" style={{ width: 240, height: 240, background: "#fff", borderRadius: 12, padding: 8, overflow: "hidden" }}>
              {qrUrl ? (
                <img src={qrUrl} alt="Mã QR donate" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div className="d4m-loading"><div className="d4m-spinner" /></div>
              )}
            </div>

            <div className="d4m-badge" style={{ background: "rgba(250,204,21,.12)", borderColor: "rgba(250,204,21,.3)", color: "#fde047" }}>
              <i className="fa-solid fa-circle-notch fa-spin" /> Đang chờ thanh toán...
            </div>
            <p className="d4m-page-subtitle mt-2">
              Hệ thống sẽ tự động kích hoạt tài khoản ngay khi nhận được tiền.
            </p>
          </div>
        )}

        {/* ===== MÀN 3: CẢM ƠN + MỞ KHÓA ===== */}
        {step === 3 && (
          <div className="text-center" style={{ position: "relative" }}>
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
              <i className="fa-solid fa-check" style={{ fontSize: 40, color: "#fff" }} />
            </div>
            <h2 className="d4m-page-title" style={{ fontSize: "1.4rem", display: "block" }}>
              Cảm ơn sếp! 🎉
            </h2>
            <p className="d4m-page-subtitle">
              Sếp đã donate <strong style={{ color: "var(--d4m-primary)" }}>{paidAmount.toLocaleString("vi-VN")}đ</strong>. Tài khoản đã được kích hoạt!
            </p>

            {/* Dịch vụ được mở khóa */}
            <div className="d4m-card mt-4" style={{ textAlign: "left", padding: "1rem" }}>
              <p className="d4m-label" style={{ marginBottom: ".75rem" }}>✨ Đã mở khóa</p>
              <div className="d4m-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
                {[
                  ["fa-solid fa-music", "D4M Music Pro"],
                  ["fa-solid fa-robot", "J.A.R.V.I.S AI"],
                  ["fa-solid fa-folder-open", "Google Drive"],
                  ["fa-solid fa-wand-magic-sparkles", "AutoCode AI"],
                ].map(([icon, name]) => (
                  <div key={name} className="d4m-card" style={{ padding: ".6rem .75rem", display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".8rem" }}>
                    <i className={icon} style={{ color: "#22c55e" }} /> {name}
                  </div>
                ))}
              </div>
            </div>

            <button
              className="d4m-btn d4m-btn-primary w-full mt-4"
              onClick={() => { setConfetti(false); onClose(); }}
              style={{ width: "100%", padding: ".85rem" }}
            >
              <i className="fa-solid fa-rocket" /> Bắt đầu trải nghiệm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** 🎆 Pháo hoa CSS */
function ConfettiBurst() {
  const colors = ["#f43f5e", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: 50 + Math.cos((i / 40) * Math.PI * 2) * 45,
    top: 50 + Math.sin((i / 40) * Math.PI * 2) * 45,
    color: colors[i % colors.length],
    delay: Math.random() * 0.3,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
            width: 10, height: 10, background: p.color, borderRadius: 2,
            animation: `confetti-fly 1.5s ${p.delay}s ease-out forwards`, opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
