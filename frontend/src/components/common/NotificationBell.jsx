// src/components/common/NotificationBell.jsx
import React, { useState, useEffect, useRef } from "react";
import { NOTIFICATION } from "../../config/urls";
import { getToken, getUser } from "../../api/client";

/**
 * 🔔 NotificationBell — chuông thông báo realtime.
 * Mở WebSocket tới /api/ws/notify/{user_id}, hiện badge số thông báo chưa đọc,
 * dropdown danh sách thông báo + nút "đánh dấu đã đọc tất cả".
 */
export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const wsRef = useRef(null);
  const dropdownRef = useRef(null);

  const resolveUserId = () => {
    const stored = getUser();
    if (stored && stored.id) return stored.id;
    const token = getToken();
    if (token) {
      try {
        const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const p = JSON.parse(decodeURIComponent(atob(b64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
        return p.id || p.user_id || (Number.isInteger(+p.sub) ? +p.sub : null);
      } catch { return null; }
    }
    return null;
  };

  const unread = items.filter((n) => !n.is_read).length;

  // Load danh sách + mở WS
  useEffect(() => {
    const uid = resolveUserId();
    if (!uid) return;
    setUserId(uid);

    fetch(NOTIFICATION.LIST(uid))
      .then((r) => r.json())
      .then((d) => { if (d.status === "success") setItems(d.notifications || []); })
      .catch(() => {});

    // WebSocket realtime
    let ws;
    try { ws = new WebSocket(NOTIFICATION.WS(uid)); } catch { return; }
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "notification") {
          const n = { id: Date.now(), ...msg.data, is_read: 0, created_at: "now" };
          setItems((prev) => [n, ...prev]);
        }
      } catch {}
    };
    ws.onclose = () => {};
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 25000);
    return () => {
      clearInterval(ping);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const markAllRead = async () => {
    if (!userId) return;
    await fetch(`${NOTIFICATION.READ_ALL}?user_id=${userId}`, { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition"
        title="Thông báo"
      >
        <i className="fa-regular fa-bell" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto d4m-card" style={{ zIndex: 100, padding: "1rem", background: "#0b0f19" }}>
          <div className="flex items-center justify-between mb-2">
            <strong className="text-sm">Thông báo</strong>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-400 hover:underline">
                Đánh dấu đã đọc
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Chưa có thông báo.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className="px-2 py-2 border-b border-white/5 flex gap-2" style={{ opacity: n.is_read ? 0.6 : 1 }}>
                <span className="mt-1 text-sm">{iconFor(n.type)}</span>
                <div>
                  <div className="text-[13px] font-semibold">{n.title}</div>
                  {n.message && <div className="text-xs text-gray-400">{n.message}</div>}
                  <div className="text-[10px] text-gray-500 mt-0.5">{n.created_at}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function iconFor(type) {
  const map = { info: "ℹ️", success: "✅", warning: "⚠️", donate: "💚" };
  return map[type] || "🔔";
}
