// src/pages/social/SocialHubPage.jsx
// Mạng xã hội D4M — giao diện theo phong cách Threads
// 🛡️ BẢN HARDENED: fix memory-leak, re-render, spam-click, a11y, dead-buttons.
import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS, API_BASE_URL } from "../../config/api";
import { EXTERNAL } from "../../config/urls";
import { getToken, parseJwt, removeToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import SEO from "../../components/common/SEO";
import DmInbox from "./DmInbox";
import CommentsPanel from "./CommentsPanel";
import ActivityPanel from "./ActivityPanel";
import StickerPicker from "./StickerPicker";
import BottomNav from "./BottomNav";
import CustomizationPanel from "./CustomizationPanel";
import AvatarFrame, { nameEffectStyle } from "./AvatarFrame";
import { SOCIAL_GLOBAL_CSS } from "./socialStyles";
import { cssFrom } from "./cssUtils";
import {
  IconHome, IconMessage, IconPlus, IconHeart, IconComment, IconShare, IconTrash,
  IconRefresh, IconLogout, IconPlay, IconPause, IconCheck, IconImage,
} from "./icons";

// ==================================================================
// 🎵 PLAYER TÁCH RIÊNG (React.memo + state nội bộ)
// WHY: trước đây `progress` nằm ở state TRANG → mỗi lần timeupdate (~4 lần/s)
// cả feed re-render gây giật. Giờ chỉ component này re-render.
// ==================================================================
const PostAudioPlayer = memo(function PostAudioPlayer({ title, url }) {
  const audioRef = useRef(null);
  const barRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // WHY: lazy init — không tạo Audio nếu user không bấm play
  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio(url);
      a.addEventListener("timeupdate", () => {
        if (a.duration && isFinite(a.duration)) setProgress((a.currentTime / a.duration) * 100);
      });
      a.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
      a.addEventListener("error", () => { setPlaying(false); showToast("Không phát được âm thanh.", "error"); });
      audioRef.current = a;
    }
    return audioRef.current;
  };

  // WHY: cleanup khi unmount — ngắt nguồn rò rỉ bộ nhớ / audio chạy ngầm
  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; } }, []);

  const toggle = () => {
    const a = getAudio();
    if (playing) { a.pause(); setPlaying(false); return; }
    a.play().catch(() => showToast("Trình duyệt chặn tự phát — bấm lại nhé.", "warning"));
    setPlaying(true);
  };
  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !a.duration || !isFinite(a.duration)) return; // WHY: chống NaN khi metadata chưa tải
    const rect = barRef.current.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111] p-3 flex items-center gap-3">
      <button
        onClick={toggle}
        className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shrink-0"
        aria-label={playing ? "Tạm dừng" : "Phát"}
      >
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div
          ref={barRef}
          className="mt-2 h-1 bg-white/15 rounded-full cursor-pointer overflow-hidden"
          onClick={seek}
          role="slider"
          aria-label="Tua bài hát"
          aria-valuenow={Math.round(progress)}
        >
          <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
});

// ==================================================================
// 📝 POST CARD (React.memo) — chỉ re-render khi dữ liệu bài viết đổi
// ==================================================================
const PostCard = memo(function PostCard({ post, liked, canDelete, onLike, onComment, onDelete, onShare, getMediaUrl, formatTimeAgo }) {
  return (
    <article className="d4m-post-card px-4 py-4 transition-colors">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <AvatarFrame src={post.avatar_url} frame={post.frame || post.avatar_frame} pet={post.pet} treasure={post.treasure} dharma={post.dharma} title={post.title} ring={post.ring} sect={post.sect} size={40} alt={`Avatar ${post.fullname || post.username}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold" style={cssFrom(nameEffectStyle(post.name_effect))}>{post.fullname}</span>
            {Number(post.role) === 1 && <span className="text-blue-500" style={{ width: 14, height: 14 }}><IconCheck /></span>}
            <span className="text-gray-500">@{post.username} · {formatTimeAgo(post.created_at)}</span>
          </div>

          {post.content && <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}

          {post.images && post.images.length > 0 && (
            <div className={`mt-3 grid gap-1 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {post.images.map((url, idx) => (
                <img
                  key={idx}
                  src={getMediaUrl(url)}
                  alt={`Ảnh ${idx + 1} của ${post.fullname || post.username}`}
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover rounded-xl border border-white/10 ${
                    /\.gif(\?|$)/i.test(url)
                      ? (post.images.length === 1 ? "w-24 h-24" : "aspect-square")
                      : (post.images.length === 1 ? "max-h-[420px]" : "aspect-square")
                  }`}
                />
              ))}
            </div>
          )}

          {post.attached_media && post.stream_links && (
            <div className="mt-3">
              {post.media_type === "video" && post.stream_links.video_url && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <video controls playsInline className="w-full max-h-[480px]">
                    <source src={getMediaUrl(post.stream_links.video_url)} type="video/mp4" />
                  </video>
                </div>
              )}
              {post.media_type === "audio" && post.stream_links.vocal_url && (
                <PostAudioPlayer title={post.attached_media} url={getMediaUrl(post.stream_links.vocal_url)} />
              )}
            </div>
          )}

          <div className="flex items-center gap-6 mt-3 text-gray-400">
            <button
              onClick={onLike}
              className={`transition hover:scale-110 active:scale-90 ${liked ? "text-rose-500" : "hover:text-rose-400"}`}
              style={{ width: 22, height: 22 }}
              aria-label={liked ? "Bỏ thích" : "Thích"}
              aria-pressed={liked}
            >
              <IconHeart filled={liked} />
            </button>
            <button onClick={onComment} className="flex items-center gap-1 hover:text-white transition hover:scale-110 active:scale-90" title="Bình luận" aria-label="Bình luận">
              <span style={{ width: 22, height: 22 }} className="block"><IconComment /></span>
              {post.comment_count > 0 && <span className="text-xs">{post.comment_count}</span>}
            </button>
            <button onClick={onShare} className="hover:text-white transition hover:scale-110 active:scale-90" title="Chia sẻ" aria-label="Chia sẻ" style={{ width: 22, height: 22 }}>
              <IconShare />
            </button>
            {canDelete && (
              <button onClick={onDelete} className="ml-auto text-gray-600 hover:text-rose-400 transition" title="Xóa" aria-label="Xóa bài viết" style={{ width: 20, height: 20 }}>
                <IconTrash />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

export default function SocialHubPage() {
  const navigate = useNavigate();

  // 1. STATE BẢO MẬT & USER
  const [isAuth, setIsAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 2. STATE FEED & TAB
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeTab, setActiveTab] = useState("for_you");

  // 3. STATE TẠO POST (modal)
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [musicList, setMusicList] = useState([]);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postImages, setPostImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPostStickers, setShowPostStickers] = useState(false);
  const [postSticker, setPostSticker] = useState(null);
  const imageInputRef = useRef(null);
  const composerRef = useRef(null);
  // 🧹 WHY: theo dõi object-URL để revoke, chống rò rỉ bộ nhớ
  const objectUrlsRef = useRef([]);

  // 5. STATE LIKE + PANELS
  const [likedSet, setLikedSet] = useState(new Set());
  const [showDm, setShowDm] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const [commentPost, setCommentPost] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);

  // ==========================================\
  // KIỂM TRA BẢO MẬT & QUYỀN TRUY CẬP
  // ==========================================
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthError("no_token"); return; }
    const payload = parseJwt(token);
    const activeOk = payload && (payload.active === 1 || Number(payload.role) === 1 || payload.role === "admin");
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now()) || !activeOk) {
      setAuthError("invalid_token"); return;
    }
    setCurrentUser({
      id: payload.user_id,
      role: payload.role,
      username: payload.sub,
      fullname: payload.full_name || payload.sub,
      avatar_url: payload.avatar_url,
    });
    setIsAuth(true);
    fetchMusicLibrary();
    fetchFeed();
    fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🎨 Inject CSS toàn cục (1 lần)
  useEffect(() => {
    if (document.getElementById("d4m-social-css")) return;
    const style = document.createElement("style");
    style.id = "d4m-social-css";
    style.textContent = SOCIAL_GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);

  // 🔄 Auto-refresh 30s — WHY: `silent` để KHÔNG nhấp nháy skeleton mỗi lần nền tự tải
  useEffect(() => {
    if (!isAuth) return;
    const id = setInterval(() => { fetchFeed(true); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  // 🧹 Revoke mọi object URL khi unmount
  useEffect(() => () => { objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  // ==========================================\
  // API
  // ==========================================
  const authHeaders = useCallback(() => ({ Authorization: `Bearer ${getToken()}` }), []);

  const fetchMusicLibrary = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.MUSIC.LIST, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setMusicList(d.songs || []); }
    } catch (e) { /* mạng lỗi thoáng qua — bỏ qua */ }
  }, []);

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setLoadingFeed(true);
    try {
      const res = await fetch(ENDPOINTS.SOCIAL.FEED, { headers: { Authorization: `Bearer ${getToken()}` } });
      // 🛡️ WHY: 401 = token chết -> về lock screen thay vì feed trống câm lặng
      if (res.status === 401) { setIsAuth(false); setAuthError("invalid_token"); return; }
      if (res.ok) { const r = await res.json(); setFeed(r.data || []); }
    } catch (e) { /* giữ feed cũ khi mạng lỗi */ }
    finally { if (!silent) setLoadingFeed(false); }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/me`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { setIsAuth(false); setAuthError("invalid_token"); return; }
      if (!res.ok) return;
      const r = await res.json();
      if (r.status === "success" && r.data) {
        setCurrentUser((prev) => ({
          ...prev,
          fullname: r.data.full_name || prev?.fullname,
          avatar_url: r.data.avatar_url || prev?.avatar_url,
          avatar_frame: r.data.avatar_frame || null,
          name_effect: r.data.name_effect || "default",
          chat_theme: r.data.chat_theme || "default",
          frame: r.data.frame || null,
          pet: r.data.pet || null,
          treasure: r.data.treasure || null,
          dharma: r.data.dharma || null,
          title: r.data.title || null,
          ring: r.data.ring || null,
          sect: r.data.sect || null,
          xu: r.data.xu || 0,
        }));
      }
    } catch (e) { /* bỏ qua */ }
  }, []);

  // 🖼️ Upload ảnh kèm preview + revoke an toàn
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (postImages.length + files.length > 6) return showToast("Tối đa 6 ảnh mỗi bài!", "error");
    setUploadingImage(true);
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(previewUrl); // 🧹 sẽ revoke khi unmount/xoá
      const tmpId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      setPostImages((prev) => [...prev, { url: null, preview: previewUrl, tmpId }]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(ENDPOINTS.SOCIAL.UPLOAD_IMAGE, {
          method: "POST", headers: authHeaders(), body: fd,
        });
        const data = await res.json();
        if (data.status === "success") {
          setPostImages((prev) => prev.map((p) => (p.tmpId === tmpId ? { ...p, url: data.url, preview: previewUrl } : p)));
        } else {
          setPostImages((prev) => prev.filter((p) => p.tmpId !== tmpId));
          showToast(data.detail || "Lỗi tải ảnh", "error");
        }
      } catch (err) {
        setPostImages((prev) => prev.filter((p) => p.tmpId !== tmpId));
        showToast("Không tải được ảnh", "error");
      }
    }
    setUploadingImage(false);
  };

  const removeComposerImage = (tmpId) => {
    setPostImages((prev) => {
      const target = prev.find((p) => p.tmpId === tmpId);
      if (target?.preview) URL.revokeObjectURL(target.preview); // 🧹 revoke ngay khi bỏ ảnh
      return prev.filter((p) => p.tmpId !== tmpId);
    });
  };

  const submitPost = async () => {
    if (isSubmitting) return; // 🛡️ WHY: chống spam submit gấp đôi (ngoài disabled)
    const hasImg = postImages.some((p) => p.url) || !!postSticker;
    if (!postContent.trim() && !selectedMedia && !hasImg)
      return showToast("Thêm chữ, ảnh, sticker hoặc nhạc để đăng!", "error");
    if (postImages.some((p) => !p.url)) return showToast("Ảnh đang tải lên, chờ chút...", "error");
    setIsSubmitting(true);
    try {
      const imgUrls = postImages.map((p) => p.url).filter(Boolean);
      if (postSticker) imgUrls.push(postSticker);
      const payload = {
        content: postContent,
        attached_media: selectedMedia ? selectedMedia.id : null,
        media_type: selectedMedia ? (selectedMedia.flags?.video ? "video" : "audio") : null,
        media_url: selectedMedia ? selectedMedia.stream_url : null,
        image_urls: imgUrls,
        music_title: selectedMedia ? selectedMedia.title : null,
        music_artist: selectedMedia ? (selectedMedia.artist || "D4M Studio") : null,
      };
      const res = await fetch(ENDPOINTS.SOCIAL.POSTS, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPostContent(""); setSelectedMedia(null); setShowComposer(false);
        setPostImages([]); setShowMusicDropdown(false); setPostSticker(null);
        showToast("Đã đăng lên Threads D4M!");
        fetchFeed();
      } else if (res.status === 401) { setIsAuth(false); setAuthError("invalid_token"); }
      else { const d = await res.json(); showToast(d.detail || "Lỗi đăng bài", "error"); }
    } catch (e) { showToast("Mất kết nối mạng!", "error"); }
    finally { setIsSubmitting(false); }
  };

  const deletePost = useCallback(async (postId) => {
    if (!window.confirm("Xóa bài này vĩnh viễn?")) return;
    try {
      const res = await fetch(ENDPOINTS.SOCIAL.POST_DELETE(postId), { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { showToast("Đã xóa"); fetchFeed(); }
      else { const d = await res.json(); showToast(d.detail || "Lỗi xóa", "error"); }
    } catch (e) { showToast("Lỗi mạng khi xóa!", "error"); }
  }, [fetchFeed]);

  const toggleLike = useCallback((postId) => {
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  }, []);

  // 🔗 WHY: nút Chia sẻ trước đây CHẾT (không handler) -> giờ share thật,
  // fallback copy link nếu trình duyệt không có navigator.share
  const sharePost = useCallback(async (post) => {
    const text = `${post.fullname || post.username} trên Threads D4M: ${(post.content || "🎵 một bài viết").slice(0, 120)}`;
    try {
      if (navigator.share) { await navigator.share({ title: "Threads D4M", text }); return; }
      await navigator.clipboard.writeText(text);
      showToast("Đã copy nội dung để chia sẻ!");
    } catch (e) { /* user hủy share */ }
  }, []);

  const handleNav = useCallback((action) => {
    setShowDm(false);
    setShowActivity(false);
    setShowCustomization(false);
    setShowComposer(false);
    if (action === "home") setActiveTab("for_you");
    else if (action === "dm") setShowDm(true);
    else if (action === "create") setShowComposer(true);
    else if (action === "activity") setShowActivity(true);
    else if (action === "profile") setShowCustomization(true);
  }, []);

  // ==========================================\
  // TIỆN ÍCH (ổn định reference cho React.memo)
  // ==========================================
  const formatTimeAgo = useCallback((dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }, []);
  const getMediaUrl = useCallback((url) => url?.startsWith("http") ? url : API_BASE_URL + url, []);
  const handleLogout = useCallback(() => { removeToken(); navigate("/auth?redirect=/social"); }, [navigate]);
  const getAvatar = (avatar_url) => getMediaUrl(avatar_url) || EXTERNAL.PLACEHOLDER_IMG;

  // Đóng dropdown nhạc khi click ngoài
  useEffect(() => {
    const onClick = (e) => { if (composerRef.current && !composerRef.current.contains(e.target)) setShowMusicDropdown(false); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ==========================================\
  // LOCK SCREEN
  // ==========================================
  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-sans">
        <div className="text-center max-w-sm mx-4">
          <div className="text-5xl mb-6 text-gray-200 font-extrabold tracking-tight">Threads <span className="text-2xl align-top">·</span> D4M</div>
          {authError === "no_token" ? (
            <p className="text-gray-400 mb-6 text-sm">Đăng nhập D4M ID để vào Threads nội bộ.</p>
          ) : (
            <p className="text-gray-400 mb-6 text-sm">Phiên đăng nhập hết hạn hoặc tài khoản chưa kích hoạt.</p>
          )}
          <button onClick={() => navigate("/auth?redirect=/social")} className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // ==========================================\
  // GIAO DIỆN CHÍNH
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0a0e17] text-white font-sans selection:bg-[#f5c15c]/30 relative">
      <SEO title="Social Hub" description="Mạng xã hội D4M — cập nhật trạng thái, chia sẻ âm nhạc và kết nối cộng đồng." />
      {/* 🌌 Nền aurora + lưới mờ */}
      <div className="d4m-bg-aurora" aria-hidden="true" />
      <div className="max-w-[640px] md:max-w-[780px] lg:max-w-[1120px] mx-auto min-h-screen relative z-10 lg:px-6">
        <div className="lg:flex lg:gap-8 min-h-screen">

        {/* 🖥️ RAIL TRÁI (desktop) — điều hướng kiểu Threads */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen py-6 pr-2 overflow-y-auto">
          <button onClick={() => navigate("/hub")} className="flex items-center gap-2.5 px-3 mb-5 hover:opacity-85 transition" aria-label="Về trung tâm D4M">
            <span className="d4m-logo-mark w-9 h-9 rounded-xl flex items-center justify-center text-black font-black text-lg">D4</span>
            <span className="text-left leading-tight">
              <span className="block text-lg font-extrabold tracking-tight d4m-brand-gradient">Social Hub</span>
              <span className="block text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Giang Hồ D4M</span>
            </span>
          </button>

          {/* 👤 THẺ USER — avatar đủ 7 slot trang bị */}
          <button onClick={() => setShowCustomization(true)} className="d4m-mini-card text-left w-full rounded-2xl border border-[#f5c15c]/20 bg-white/[0.04] hover:bg-[#f5c15c]/5 hover:border-[#f5c15c]/50 transition p-3 mb-4 group">
            <div className="flex items-center gap-3">
              <AvatarFrame
                src={currentUser?.avatar_url}
                frame={currentUser?.frame || currentUser?.avatar_frame}
                pet={currentUser?.pet} treasure={currentUser?.treasure}
                dharma={currentUser?.dharma} title={currentUser?.title}
                ring={currentUser?.ring} sect={currentUser?.sect}
                size={44} alt=""
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate group-hover:text-[#ffd77a] transition">{currentUser?.fullname || currentUser?.username}</div>
                <div className="text-[11px] text-gray-500 truncate">@{currentUser?.username}</div>
                <div className="mt-0.5 text-[10px] font-bold text-[#1ed760]">🪙 {Number(currentUser?.xu || 0).toLocaleString("vi-VN")} Xu</div>
              </div>
            </div>
          </button>

          <button onClick={() => handleNav("home")} className={`d4m-nav-btn ${activeTab === "for_you" ? "d4m-nav-active" : ""}`}><span style={{width:22,height:22}} className="block"><IconHome /></span> Trang chủ</button>
          <button onClick={() => handleNav("dm")} className="d4m-nav-btn"><span style={{width:22,height:22}} className="block"><IconMessage /></span> Tin nhắn {dmUnread > 0 && <span className="ml-auto text-[10px] bg-[#1ed760] text-black rounded-full px-1.5 py-0.5 font-bold">{dmUnread}</span>}</button>
          <button onClick={() => handleNav("activity")} className="d4m-nav-btn"><span style={{width:22,height:22}} className="block"><IconHeart /></span> Hoạt động</button>
          <button onClick={() => setShowCustomization(true)} className="d4m-nav-btn"><span className="text-base leading-none">🎨</span> Hồ sơ & Phong cách</button>

          <button onClick={() => handleNav("create")} className="d4m-btn-grad w-full mt-5 py-3 rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2">
            <span style={{width:18,height:18}} className="block"><IconPlus /></span> Đăng bài ngay
          </button>

          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold text-gray-500 hover:bg-rose-500/10 hover:text-rose-400 transition"><span style={{width:20,height:20}} className="block"><IconLogout /></span> Đăng xuất</button>
        </aside>

        {/* CỘT GIỮA: feed */}
        <div className="flex-1 min-w-0 flex flex-col relative">

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#0a0e17]/85 backdrop-blur-xl border-b border-[#f5c15c]/15">
          <div className="flex items-center justify-between px-4 py-2.5">
            <button onClick={() => navigate("/hub")} className="flex items-center gap-2 hover:opacity-75 transition lg:hidden" aria-label="Về trung tâm D4M">
              <span className="d4m-logo-mark w-7 h-7 rounded-lg flex items-center justify-center text-black font-black text-xs">D4</span>
              <span className="text-lg font-extrabold tracking-tight d4m-brand-gradient">Social Hub</span>
            </button>
            <div className="hidden lg:block text-[13px] text-gray-500 font-semibold">
              ⚔️ Giang hồ có {feed.length} tin truyền
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              <button onClick={() => setShowCustomization(true)} className="hover:text-[#1ed760] transition" title="Cá nhân hóa" aria-label="Cá nhân hóa" style={{ width: 22, height: 22 }}><span className="text-base leading-none">🎨</span></button>
              <button onClick={() => fetchFeed()} className="hover:text-white transition" title="Làm mới" aria-label="Làm mới bảng tin" style={{ width: 22, height: 22 }}><IconRefresh /></button>
              <button onClick={handleLogout} className="hover:text-rose-400 transition" title="Đăng xuất" aria-label="Đăng xuất" style={{ width: 22, height: 22 }}><IconLogout /></button>
            </div>
          </div>

          <div className="flex">
            {[["for_you", "✨ Cho bạn"], ["following", "👥 Đang theo dõi"]].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className={`flex-1 py-2.5 text-sm font-bold transition relative ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {label}
                <div className={`mt-2 mx-auto h-1 w-10 rounded-full transition ${activeTab === tab ? "d4m-tab-underline" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
        </header>

        {/* FEED */}
        <main className="flex-1 pb-20">
          {/* ✨ Dải chào + đăng bài nhanh (ẩn khi đang tải) */}
          {!loadingFeed && activeTab === "for_you" && (
            <div className="mx-4 lg:mx-2 mt-4 mb-2 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-transparent p-3.5 flex items-center gap-3">
              <AvatarFrame
                src={currentUser?.avatar_url}
                frame={currentUser?.frame || currentUser?.avatar_frame}
                pet={currentUser?.pet} treasure={currentUser?.treasure}
                dharma={currentUser?.dharma} title={currentUser?.title}
                ring={currentUser?.ring} sect={currentUser?.sect}
                size={38} alt=""
              />
              <button
                onClick={() => handleNav("create")}
                className="flex-1 text-left px-4 py-2.5 rounded-full bg-white/[0.06] border border-[#f5c15c]/15 text-sm text-gray-400 hover:bg-[#f5c15c]/10 hover:border-[#f5c15c]/50 hover:text-[#ffd77a] transition"
              >
                {(currentUser?.fullname || currentUser?.username || "Bạn").split(" ")[0]} ơi, hôm nay có gì mới? 🎤
              </button>
              <button onClick={() => handleNav("create")} className="d4m-btn-grad hidden sm:flex w-10 h-10 rounded-full items-center justify-center active:scale-95 transition" aria-label="Đăng bài">
                <span style={{width:18,height:18}} className="block"><IconPlus /></span>
              </button>
            </div>
          )}

          {loadingFeed ? (
            <div className="space-y-5 p-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 animate-pulse">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3 bg-white/10 rounded w-1/3"></div>
                    <div className="h-3 bg-white/10 rounded w-full"></div>
                    <div className="h-3 bg-white/10 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "following" ? (
            // WHY: tab following chưa có dữ liệu follow -> thông báo trung thực, không dead-end
            <div className="text-center text-gray-500 py-20 px-6">
              <div className="text-4xl mb-3 text-gray-600">👥</div>
              <p className="font-semibold text-white">Tuyệt học "Đang theo dõi" sắp xuất thế</p>
              <p className="text-sm mt-1">Hiện tại hãy khám phá bảng tin "Cho bạn" nhé!</p>
              <button onClick={() => setActiveTab("for_you")} className="mt-4 px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition">
                Về bảng tin Cho bạn
              </button>
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              <div className="text-4xl mb-3 text-gray-600">✕</div>
              <p className="font-semibold">Bảng tin trống rỗng</p>
              <p className="text-sm mt-1">Hãy tạo bài viết đầu tiên nhé!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {feed.map((post) => (
                <PostCard
                  key={post.post_id}
                  post={post}
                  liked={likedSet.has(post.post_id)}
                  canDelete={!!currentUser && (Number(currentUser.role) === 1 || post.user_id === currentUser.id)}
                  onLike={() => toggleLike(post.post_id)}
                  onComment={() => setCommentPost(post)}
                  onDelete={() => deletePost(post.post_id)}
                  onShare={() => sharePost(post)}
                  getMediaUrl={getMediaUrl}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </main>

        {/* COMPOSER MODAL */}
        {showComposer && createPortal(
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex overflow-y-auto p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowComposer(false); }} role="dialog" aria-modal="true" aria-label="Tạo bài viết">
            <div className="w-full max-w-lg m-auto max-h-[90dvh] overflow-y-auto bg-[#111] rounded-2xl border border-white/10 p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Tạo bài viết</h2>
                <button onClick={() => setShowComposer(false)} className="text-gray-500 hover:text-white" style={{ width: 24, height: 24 }} aria-label="Đóng"><IconPlus /></button>
              </div>

              <div className="flex gap-3">
                <AvatarFrame src={currentUser?.avatar_url} frame={currentUser?.frame || currentUser?.avatar_frame} pet={currentUser?.pet} treasure={currentUser?.treasure} dharma={currentUser?.dharma} title={currentUser?.title} ring={currentUser?.ring} sect={currentUser?.sect} size={36} alt="" />
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1">{currentUser?.fullname}</div>
                  <textarea
                    autoFocus
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    className="w-full bg-transparent text-white placeholder-gray-500 text-[15px] resize-none outline-none leading-relaxed"
                    placeholder="Bắt đầu một thread..."
                    aria-label="Nội dung bài viết"
                  />

                  {postImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {postImages.map((img) => (
                        <div key={img.tmpId} className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          {!img.url && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                          <button
                            onClick={() => removeComposerImage(img.tmpId)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-rose-500"
                            aria-label="Xóa ảnh"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {postSticker && (
                    <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between w-fit">
                      <img src={getMediaUrl(postSticker)} alt="Sticker" className="w-14 h-14 rounded-lg object-cover" />
                      <button onClick={() => setPostSticker(null)} className="ml-2 text-gray-500 hover:text-rose-400 p-1" aria-label="Bỏ sticker">✕</button>
                    </div>
                  )}

                  {selectedMedia && (
                    <div className="mt-2 p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 text-white"><IconPlay /></div>
                        <span className="text-xs font-semibold truncate">{selectedMedia.title}</span>
                        <span className="text-[10px] text-gray-500">{selectedMedia.artist}</span>
                      </div>
                      <button onClick={() => setSelectedMedia(null)} className="text-gray-500 hover:text-rose-400 p-1" style={{ width: 20, height: 20 }} aria-label="Bỏ nhạc đính kèm"><IconPlus /></button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="relative flex items-center">
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage || postImages.length >= 6}
                        className="text-gray-400 hover:text-white p-2 disabled:opacity-40"
                        title="Thêm ảnh"
                        style={{ width: 30, height: 30 }}
                        aria-label="Thêm ảnh"
                      ><IconImage /></button>
                      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowPostStickers(!showPostStickers); }}
                          className="text-gray-400 hover:text-white p-2"
                          style={{ width: 30, height: 30 }}
                          title="Sticker / GIF"
                          aria-label="Chọn sticker"
                          aria-expanded={showPostStickers}
                        ><span className="text-base leading-none">😊</span></button>
                        {showPostStickers && (
                          <div className="absolute bottom-10 left-0 z-50">
                            <StickerPicker
                              onSelect={(url) => { setPostSticker(url); setShowPostStickers(false); }}
                              onClose={() => setShowPostStickers(false)}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowMusicDropdown(!showMusicDropdown); }}
                        className="text-gray-400 hover:text-white p-2"
                        style={{ width: 30, height: 30 }}
                        aria-label="Đính kèm nhạc"
                        aria-expanded={showMusicDropdown}
                      ><IconMessage /></button>
                      {showMusicDropdown && (
                        <div ref={composerRef} className="absolute bottom-10 left-0 w-64 max-h-60 overflow-y-auto bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-2xl z-50 p-2">
                          <div className="text-[10px] font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">Kho nhạc D4M</div>
                          <div className="flex flex-col gap-1">
                            {musicList.map((song) => (
                              <button key={song.id} onClick={() => { setSelectedMedia(song); setShowMusicDropdown(false); }} className="text-left px-3 py-2.5 hover:bg-white/10 rounded-xl text-xs flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 text-white"><IconPlay /></div>
                                <div className="min-w-0">
                                  <div className="font-bold truncate">{song.title}</div>
                                  <div className="text-[10px] text-gray-500 truncate">{song.artist || "D4M Studio"}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={submitPost}
                      disabled={isSubmitting}
                      className="px-5 py-2 d4m-btn-grad rounded-full text-sm font-bold transition active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? "Đang đăng..." : "Đăng"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        <BottomNav
          active={activeTab === "for_you"}
          dmUnread={dmUnread}
          avatarUrl={getAvatar(currentUser?.avatar_url)}
          frame={currentUser?.frame || currentUser?.avatar_frame}
          pet={currentUser?.pet}
          treasure={currentUser?.treasure}
          dharma={currentUser?.dharma}
          title={currentUser?.title}
          ring={currentUser?.ring}
          sect={currentUser?.sect}
          onNavigate={handleNav}
        />
        </div>
        </div>
      </div>

      {showDm && <DmInbox currentUser={currentUser} onBack={() => setShowDm(false)} onUnreadChange={setDmUnread} onNavigate={handleNav} />}
      {showActivity && <ActivityPanel currentUser={currentUser} onBack={() => setShowActivity(false)} onNavigate={handleNav} />}
      {commentPost && (
        <CommentsPanel post={commentPost} currentUser={currentUser} onClose={() => setCommentPost(null)} />
      )}
      {showCustomization && (
        <CustomizationPanel
          currentUser={currentUser}
          onBack={() => { setShowCustomization(false); fetchFeed(true); fetchMyProfile(); }}
          onNavigate={handleNav}
          onEditInfo={() => { setShowCustomization(false); navigate("/admin/profile"); }}
          onSpiritChanged={() => { fetchFeed(true); fetchMyProfile(); }}
          onSaved={(updates) => {
            setCurrentUser((prev) => ({ ...prev, ...updates }));
            setShowCustomization(false);
            fetchFeed(true);
          }}
        />
      )}
    </div>
  );
}
