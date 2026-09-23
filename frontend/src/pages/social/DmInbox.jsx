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
import RealmName, { RealmBadge } from "./RealmName";
import { API_BASE_URL } from "../../config/urls";

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
  const [presenceMap, setPresenceMap] = useState({}); // user_id -> {online,label}
  const typingRef = useRef({});
  const conversationsRef = useRef([]);
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
      conversationsRef.current = convs;
      loadPresence(convs.map((c) => c.user?.id).filter(Boolean));
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

  const loadPresence = async (ids) => {
    if (!ids?.length) return;
    try {
      const res = await fetch(SOCIAL.PRESENCE_BATCH, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ids }) });
      const d = await res.json();
      if (d.status === "success") setPresenceMap(d.data || {});
    } catch (e) { /* im lặng */ }
  };

  const [attachUrl, setAttachUrl] = useState(null);
  const [attaching, setAttaching] = useState(false);

  const uploadAttach = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(SOCIAL.UPLOAD_IMAGE, { headers: authHeaders(), method: "POST", body: fd });
      const d = await res.json();
      if (d.status === "success" && d.url) setAttachUrl(d.url);
      else showToast(d.detail || "Upload ảnh thất bại", "error");
    } catch (err) { showToast("Lỗi mạng", "error"); }
    finally { setAttaching(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !attachUrl) || sending || !activeConvo) return;
    setDraft("");
    const img = attachUrl; setAttachUrl(null);
    setSending(true);
    try {
      const res = await fetch(SOCIAL.CONVERSATION_SEND(activeConvo.conversation_id), {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ content: text || null, image_url: img }),
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

  // ========== PRESENCE POLL (60s) ==========
  useEffect(() => {
    loadConversations();
    const t = setInterval(() => {
      loadPresence((conversationsRef.current || []).map((c) => c.user?.id).filter(Boolean));
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== REALTIME (WebSocket DM + typing) ==========
  useEffect(() => {
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

  const fmtDay = (iso) => {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T"));
  const today = new Date(); const yest = new Date(Date.now() - 864e5);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Hôm nay";
  if (same(d, yest)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
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

  return (
    <div className="d4m-view">
    <div className="d4m-view-card">
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
                    <AvatarFrame src={u.avatar_url || AVATAR(u.username)} frame={u.frame || u.avatar_frame} pet={u.pet} treasure={u.treasure} dharma={u.dharma} title={u.title} ring={u.ring} sect={u.sect} size={40} alt={`Ảnh đại diện ${u.fullname}`} />
                    <div>
                      <RealmName realmIndex={u.realm_index} spiritRoot={u.spirit_root} effectId={u.name_effect} name={u.fullname || u.username} className="text-sm" />
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
                        <span className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${presenceMap[String(c.user.id)]?.online ? "bg-emerald-400" : "bg-gray-600"}`} />
                          {c.user.fullname || c.user.username}
                        </span>
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
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    <RealmName realmIndex={activeConvo.user.realm_index} spiritRoot={activeConvo.user.spirit_root}
                      effectId={activeConvo.user.name_effect} name={activeConvo.user.fullname || activeConvo.user.username} className="font-bold" />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    {typingMap[activeConvo.conversation_id] ? (
                      <span className="text-emerald-400 animate-pulse">đang nhập...</span>
                    ) : (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${presenceMap[String(activeConvo.user.id)]?.online ? "bg-emerald-400" : "bg-gray-500"}`} />
                        <span className="truncate">{presenceMap[String(activeConvo.user.id)]?.label || `@${activeConvo.user.username}`}</span>
                        <RealmBadge realmIndex={activeConvo.user.realm_index} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-1" style={{ background: myTheme.themeBg }}>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-10">Hãy gửi lời chào đầu tiên 👋</div>
                )}
                {messages.map((m, i) => {
                  const mine = m.sender_id === me;
                  const theme = mine ? myTheme : (CHAT_THEMES[m.chat_theme] || CHAT_THEMES.default);
                  const prev = messages[i - 1];
                  const next = messages[i + 1];
                  // 📅 divider khi đổi ngày
                  const newDay = !prev || String(prev.created_at || "").slice(0, 10) !== String(m.created_at || "").slice(0, 10);
                  // 🧩 nhóm tin liên tiếp cùng người gửi (cách nhau < 3 phút)
                  const grouped = prev && !newDay && prev.sender_id === m.sender_id &&
                    (new Date(String(m.created_at).replace(" ", "T")) - new Date(String(prev.created_at).replace(" ", "T"))) < 180000;
                  const lastOfGroup = !next || next.sender_id !== m.sender_id ||
                    String(next.created_at || "").slice(0, 10) !== String(m.created_at || "").slice(0, 10);
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <div className="flex items-center justify-center my-3">
                          <span className="d4m-day-chip">{fmtDay(m.created_at)}</span>
                        </div>
                      )}
                      <div className={`d4m-chat ${mine ? "mine" : "theirs"}`} style={{ marginTop: grouped ? 2 : 10 }}>
                        {!mine && (grouped ? <div style={{ width: 28 }} /> :
                          <AvatarFrame src={m.avatar_url || AVATAR(m.username)} frame={m.avatar_frame} pet={m.pet} treasure={m.treasure} size={28} alt="" />
                        )}
                        <div className="ml-1.5 mr-1.5" />
                        <div
                          className="d4m-bubble"
                          style={{
                            background: mine ? theme.mineBg : theme.theirsBg,
                            color: mine ? theme.mineColor : theme.theirsColor,
                            borderRadius: theme.bubbleRadius,
                            boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                          }}
                        >
                          {m.image_url && (
                            <img src={m.image_url.startsWith("http") ? m.image_url : API_BASE_URL + m.image_url}
                              alt="ảnh" loading="lazy" className="rounded-xl mb-1 max-h-64 w-full object-cover" />
                          )}
                          {m.content && <p className="text-sm break-words whitespace-pre-wrap" style={{ margin: 0 }}>{m.content}</p>}
                          <div className="text-[10px] mt-0.5 opacity-70 flex items-center justify-end gap-1">
                            {lastOfGroup && <span>{fmtTime(m.created_at)}</span>}
                            {mine && (
                              <span className={m.is_read ? "text-sky-300 font-bold" : ""} title={m.is_read ? "Đã đọc" : "Đã gửi"}>
                                {m.is_read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {attachUrl && (
                <div className="px-3 pt-2 border-t border-white/10">
                  <div className="relative inline-block">
                    <img src={attachUrl.startsWith("http") ? attachUrl : API_BASE_URL + attachUrl} alt="đính kèm"
                      className="w-20 h-20 object-cover rounded-xl border border-[#f5c15c]/40" />
                    <button type="button" onClick={() => setAttachUrl(null)} aria-label="Bỏ ảnh đính kèm"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">✕</button>
                  </div>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2 p-3 border-t border-white/10">
                <label className="w-10 h-10 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#ffd77a] hover:border-[#f5c15c]/40 cursor-pointer transition" title="Đính kèm ảnh">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }} aria-hidden="true">
                    <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 8A1.5 1.5 0 1110 9.5 1.5 1.5 0 018.5 8zM5 19l4-7 3 4 2.5-3L19 19z" />
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAttach} disabled={attaching} />
                </label>
                <input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); notifyTyping(); }}
                  placeholder="Tin nhắn..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  aria-label="Gửi tin nhắn"
                  className="w-11 h-11 shrink-0 rounded-full d4m-btn-grad flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }} aria-hidden="true">
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                  </svg>
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
    </div>
    </div>
  );
}
