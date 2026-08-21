// src/pages/social/DmInbox.jsx
// 💬 Hộp thư tin nhắn (DM) — giao diện theo phong cách Threads
// - Hộp thư: danh sách cuộc trò chuyện, tin nhắn mới nhất, badge chưa đọc
// - Cửa sổ chat 1-1: avatar, tên, nội dung, thời gian
// - Realtime qua WebSocket /api/ws/dm/{userId}
import { useEffect, useRef, useState } from "react";
import { SOCIAL } from "../../config/urls";
import { getToken, parseJwt } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconMessage, IconBack } from "./icons";
import { CHAT_THEMES, SOCIAL_GLOBAL_CSS } from "./socialStyles";
import AvatarFrame from "./AvatarFrame";
import { createPortal } from "react-dom";

const AVATAR = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

export default function DmInbox({ currentUser, onBack, onUnreadChange, onNavigate }) {
  const me = currentUser?.id;
  // Theme chat của mình (người đang xem)
  const myTheme = CHAT_THEMES[currentUser?.chat_theme] || CHAT_THEMES.default;
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null); // {conversation_id, user}
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [userList, setUserList] = useState([]);
  const [search, setSearch] = useState("");
  const [typingMap, setTypingMap] = useState({}); // conversation_id -> {userId, at}
  const typingRef = useRef({});
  const lastTypingSentRef = useRef(0);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  // ========== HỘP THƯ ==========
  const loadConversations = async () => {
    try {
      const res = await fetch(SOCIAL.CONVERSATIONS, { headers: authHeaders() });
      const data = await res.json();
      const convs = data.data || [];
      setConversations(convs);
      // 👁️ Cập nhật tổng tin chưa đọc lên parent (badge bottom nav)
      if (onUnreadChange) {
        const total = convs.reduce((s, c) => s + (c.unread || 0), 0);
        onUnreadChange(total);
      }
    } catch (e) {
      showToast("Lỗi tải hộp thư", "error");
    } finally {
      setLoading(false);
    }
  };

  const openConversation = async (convId, user) => {
    setActiveConvo({ conversation_id: convId, user });
    try {
      const res = await fetch(SOCIAL.CONVERSATION_MESSAGES(convId), { headers: authHeaders() });
      const data = await res.json();
      setMessages(data.data || []);
      // refresh hộp thư để cập nhật badge
      loadConversations();
    } catch (e) {
      showToast("Lỗi tải tin nhắn", "error");
    }
  };

  const startNewConversation = async (user) => {
    try {
      const res = await fetch(SOCIAL.CONVERSATION_OPEN, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setShowNew(false);
        setSearch("");
        await loadConversations();
        openConversation(data.data.conversation_id, data.data.user);
      }
    } catch (e) {
      showToast("Không mở được hộp thoại", "error");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeConvo) return;
    setDraft("");
    setSending(true);
    try {
      const res = await fetch(SOCIAL.CONVERSATION_SEND(activeConvo.conversation_id), {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setMessages((prev) => [...prev, data.data]);
        scrollToBottom();
        loadConversations();
      }
    } catch (err) {
      setDraft(text);
      showToast("Gửi thất bại", "error");
    } finally {
      setSending(false);
    }
  };

  // ⌨️ Gửi typing indicator (throttle 2s) qua WebSocket
  const notifyTyping = () => {
    if (!activeConvo || !wsRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    try {
      wsRef.current.send(JSON.stringify({ type: "typing", conversation_id: activeConvo.conversation_id }));
    } catch (_) {}
  };

  // ========== REALTIME ==========
  useEffect(() => {
    loadConversations();
    if (!me) return;
    const ws = new WebSocket(SOCIAL.WS_DM(me));
    wsRef.current = ws;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "dm") {
          const m = msg.data;
          // nếu đang mở đúng cuộc trò chuyện → append trực tiếp
          if (activeConvoRef.current && m.sender_id !== me) {
            // tìm conversation của người gửi
            setMessages((prev) => [...prev, m]);
            scrollToBottom();
          }
          loadConversations(); // cập nhật hộp thư + badge
        }
        if (msg.type === "typing") {
          // 👁️ Ai đó đang gõ trong 1 cuộc trò chuyện
          const key = String(msg.conversation_id);
          const now = Date.now();
          typingRef.current[key] = { userId: msg.sender_id, at: now };
          setTypingMap({ ...typingRef.current });
          // Tự ẩn sau 3s
          setTimeout(() => {
            if (typingRef.current[key] && typingRef.current[key].at === now) {
              delete typingRef.current[key];
              setTypingMap({ ...typingRef.current });
            }
          }, 3000);
        }
      } catch (_) {}
    };
    ws.onclose = () => {};
    return () => { try { ws.close(); } catch (_) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConvoRef = useRef(null);
  useEffect(() => { activeConvoRef.current = activeConvo; }, [activeConvo]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  };
  useEffect(() => { scrollToBottom(); }, [messages, activeConvo]);

  // ========== TÌM NGƯỜI DÙNG ==========
  const loadUsers = async () => {
    try {
      const url = search ? SOCIAL.USER_SEARCH(search) : SOCIAL.USERS;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      setUserList(data.data || []);
    } catch (e) {}
  };
  useEffect(() => {
    if (showNew) { loadUsers(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNew, search]);

  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso.replace(" ", "T"));
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso.replace(" ", "T"));
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  // Đảm bảo CSS toàn cục (bong bóng Messenger) đã được inject
  useEffect(() => {
    if (document.getElementById("d4m-social-css")) return;
    const style = document.createElement("style");
    style.id = "d4m-social-css";
    style.textContent = SOCIAL_GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300">
          <IconBack />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">Tin nhắn</h1>
        <button
          onClick={() => setShowNew(true)}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold text-white"
        >
          Tin nhắn mới
        </button>
      </header>

      <div className="flex flex-1 min-h-0 pb-16">
        {/* ===== HỘP THƯ (danh sách) ===== */}
        <aside className={`w-full md:w-80 lg:w-96 border-r border-white/10 flex flex-col ${activeConvo ? "hidden md:flex" : "flex"}`}>
          {showNew ? (
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setShowNew(false)} className="text-sm text-gray-400 hover:text-white">←</button>
                <h2 className="font-semibold text-white">Tạo tin nhắn mới</h2>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm người dùng..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 mb-3"
              />
              <div className="space-y-1">
                {userList.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 text-left"
                  >
                    <AvatarFrame src={u.avatar_url || AVATAR(u.username)} frame={u.avatar_frame} pet={u.pet} treasure={u.treasure} size={40} alt={`Ảnh đại diện ${u.fullname}`} />
                    <div>
                      <div className="text-sm font-semibold text-white">{u.fullname || u.username}</div>
                      <div className="text-xs text-gray-500">@{u.username}</div>
                    </div>
                  </button>
                ))}
                {userList.length === 0 && <div className="text-sm text-gray-500 text-center py-6">Không tìm thấy người dùng.</div>}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10 text-gray-500 text-sm">Đang tải...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <IconMessage />
                  </div>
                  <p className="text-gray-400 font-medium">Chưa có tin nhắn</p>
                  <p className="text-sm text-gray-500 mt-1">Nhấn "Tin nhắn mới" để bắt đầu trò chuyện.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.conversation_id}
                    onClick={() => openConversation(c.conversation_id, c.user)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${activeConvo?.conversation_id === c.conversation_id ? "bg-white/5" : ""}`}
                  >
                    <AvatarFrame src={c.user.avatar_url || AVATAR(c.user.username)} frame={c.user.avatar_frame} pet={c.user.pet} treasure={c.user.treasure} size={44} alt={`Ảnh đại diện ${c.user.fullname}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white truncate">{c.user.fullname || c.user.username}</span>
                        <span className="text-[11px] text-gray-500">{fmtDate(c.last_message_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500 truncate">
                          {c.last_sender_id === me ? "Bạn: " : ""}{c.last_content}
                        </span>
                        {c.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#1ed760] text-black text-[10px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>

        {/* ===== CỬA SỔ CHAT ===== */}
        <section className={`flex-1 flex flex-col min-w-0 ${activeConvo ? "flex" : "hidden md:flex"}`}>
          {activeConvo ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button onClick={() => setActiveConvo(null)} className="md:hidden p-1 -ml-2 rounded-full hover:bg-white/10 text-gray-300" aria-label="Quay lại hộp thư">
                  <IconBack />
                </button>
                <AvatarFrame src={activeConvo.user.avatar_url || AVATAR(activeConvo.user.username)} frame={activeConvo.user.avatar_frame} pet={activeConvo.user.pet} treasure={activeConvo.user.treasure} size={36} alt={`Ảnh đại diện ${activeConvo.user.fullname}`} />
                <div>
                  <div className="text-sm font-semibold text-white">{activeConvo.user.fullname || activeConvo.user.username}</div>
                  <div className="text-xs text-gray-500">
                    {typingMap[activeConvo.conversation_id] ? (
                      <span className="text-[#1ed760] animate-pulse">Đang nhập...</span>
                    ) : (
                      <>@{activeConvo.user.username}</>
                    )}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5" style={{ background: myTheme.themeBg }}>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-10">Hãy gửi lời chào đầu tiên 👋</div>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === me;
                  // người gửi dùng theme chat của họ (nếu có), còn tin của mình dùng theme của mình
                  const theme = mine ? myTheme : (CHAT_THEMES[m.chat_theme] || CHAT_THEMES.default);
                  return (
                    <div key={m.id} className={`d4m-chat ${mine ? "mine" : "theirs"}`}>
                      {!mine && (
                        <AvatarFrame src={m.avatar_url || AVATAR(m.username)} frame={m.avatar_frame} pet={m.pet} treasure={m.treasure} size={28} alt="" />
                      )}
                      <div className="ml-1.5 mr-1.5" />
                      <div
                        className="d4m-bubble"
                        style={{
                          background: mine ? theme.mineBg : theme.theirsBg,
                          color: mine ? theme.mineColor : theme.theirsColor,
                          borderRadius: theme.bubbleRadius,
                        }}
                      >
                        <p className="text-sm break-words whitespace-pre-wrap" style={{ margin: 0 }}>{m.content}</p>
                        <div className="text-[10px] mt-0.5 opacity-70" style={{ textAlign: "right" }}>{fmtTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-white/10">
                <input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); notifyTyping(); }}
                  placeholder="Tin nhắn..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="px-5 py-2.5 rounded-full bg-[#1ed760] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#3af176]"
                >
                  Gửi
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <IconMessage />
              </div>
              <p className="text-white font-semibold">Tin nhắn của bạn</p>
              <p className="text-sm mt-1">Chọn một cuộc trò chuyện hoặc bắt đầu cuộc trò chuyện mới.</p>
            </div>
          )}
        </section>
      </div>
    </div>,
    document.body
  );
}
