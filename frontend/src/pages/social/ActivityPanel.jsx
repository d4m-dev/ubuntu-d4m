// src/pages/social/ActivityPanel.jsx
// ❤️ Hoạt động (Activity) — giống tab Activity của Threads
// Hiện các thông báo tương tác (bình luận, like, hệ thống) realtime.
import { useEffect, useRef, useState } from "react";
import { NOTIFICATION } from "../../config/urls";
import { getToken } from "../../services/api";
import { IconBack } from "./icons";
import { createPortal } from "react-dom";

const AVATAR = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const fmtAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.max(0, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

export default function ActivityPanel({ currentUser, onBack, onNavigate }) {
  const me = currentUser?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  const load = async () => {
    try {
      const res = await fetch(NOTIFICATION.LIST(me), { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setItems(data.notifications || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!me) return;
    const ws = new WebSocket(NOTIFICATION.WS(me));
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "notification") {
          const n = msg.data;
          setItems((prev) => [{ ...n, id: Date.now() }, ...prev]);
        }
      } catch (_) {}
    };
    return () => { try { ws.close(); } catch (_) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = async () => {
    try {
      await fetch(`${NOTIFICATION.READ_ALL}?user_id=${me}`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems((prev) => prev.map((i) => ({ ...i, is_read: 1 })));
    } catch (_) {}
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center gap-3 px-4 h-12 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300">
          <IconBack />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">Hoạt động</h1>
        {items.some((i) => !i.is_read) && (
          <button onClick={markAllRead} className="text-sm text-gray-400 hover:text-white">Đánh dấu đã đọc</button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-16">
        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4 text-2xl">❤️</div>
            <p className="text-gray-400 font-medium">Chưa có hoạt động</p>
            <p className="text-sm text-gray-500 mt-1">Khi ai đó bình luận hoặc tương tác, thông báo sẽ hiện ở đây.</p>
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 ${n.is_read ? "opacity-60" : ""}`}>
              <img src={AVATAR("d4m")} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white break-words">{n.title}</p>
                {n.message && <p className="text-xs text-gray-500 mt-0.5 break-words">{n.message}</p>}
              </div>
              <span className="text-[11px] text-gray-500 shrink-0">{fmtAgo(n.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );
}
