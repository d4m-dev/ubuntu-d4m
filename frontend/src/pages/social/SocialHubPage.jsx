// src/pages/social/SocialHubPage.jsx
// Mạng xã hội D4M — giao diện theo phong cách Threads
import React, { useState, useEffect, useRef } from "react";
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

export default function SocialHubPage() {
  const navigate = useNavigate();

  // 1. STATE BẢO MẬT & USER
  const [isAuth, setIsAuth] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 2. STATE FEED & TAB
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeTab, setActiveTab] = useState("for_you"); // for_you | following

  // 3. STATE TẠO POST (modal)
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [musicList, setMusicList] = useState([]);
  const [showMusicDropdown, setShowMusicDropdown] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 🖼️ Ảnh đăng kèm status
  const [postImages, setPostImages] = useState([]);      // mảng {url, preview}
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPostStickers, setShowPostStickers] = useState(false);
  const [postSticker, setPostSticker] = useState(null);  // sticker GIF đăng kèm
  const imageInputRef = useRef(null);
  const composerRef = useRef(null);

  // 4. STATE AUDIO PLAYER
  const audioRef = useRef(new Audio());
  const [playingId, setPlayingId] = useState(null);
  const [progress, setProgress] = useState(0);

  // 5. STATE LIKE
  const [likedSet, setLikedSet] = useState(new Set());
  // 💬 DM & Bình luận (Threads-style)
  const [showDm, setShowDm] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const [commentPost, setCommentPost] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);

  // ==========================================
  // KIỂM TRA BẢO MẬT & QUYỀN TRUY CẬP
  // ==========================================
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthError("no_token"); return; }
    const payload = parseJwt(token);
    // 👑 Chấp nhận cả token admin (không có claim active) lẫn SSO (active=1)
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
  }, []);

  // 🎨 Inject CSS toàn cục cho khung avatar & hiệu ứng tên & chat theme
  useEffect(() => {
    if (document.getElementById("d4m-social-css")) return;
    const style = document.createElement("style");
    style.id = "d4m-social-css";
    style.textContent = SOCIAL_GLOBAL_CSS;
    document.head.appendChild(style);
  }, []);

  // 🔄 Auto-refresh feed mỗi 30s (giống Threads tự cập nhật bảng tin)
  useEffect(() => {
    if (!isAuth) return;
    const id = setInterval(() => { fetchFeed(); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  // Audio events
  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    const handleEnded = () => { setPlayingId(null); setProgress(0); };
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  const togglePlay = (postId, audioUrl) => {
    const audio = audioRef.current;
    if (playingId === postId) { audio.pause(); setPlayingId(null); return; }
    if (audio.src !== audioUrl) audio.src = audioUrl;
    audio.play(); setPlayingId(postId);
  };
  const handleSeek = (e, postId) => {
    if (playingId !== postId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  // ==========================================
  // API
  // ==========================================
  const fetchMusicLibrary = async () => {
    try {
      const res = await fetch(ENDPOINTS.MUSIC.LIST, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const d = await res.json(); setMusicList(d.songs || []); }
    } catch (e) {}
  };

  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await fetch(ENDPOINTS.SOCIAL.FEED, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { const r = await res.json(); setFeed(r.data || []); }
    } catch (e) {} finally { setLoadingFeed(false); }
  };

  // 👤 Nạp hồ sơ đầy đủ của tôi (khung viền + Linh thú + Linh bảo + Xu)
  // để avatar của CHÍNH TÔI cũng hiển thị đồng bộ như người khác
  const fetchMyProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/me`, { headers: { Authorization: `Bearer ${getToken()}` } });
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
          pet: r.data.pet || null,
          treasure: r.data.treasure || null,
          xu: r.data.xu || 0,
        }));
      }
    } catch (e) {}
  };

  // 🖼️ Chọn & upload ảnh đăng kèm status
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // cho phép chọn lại cùng file
    if (!files.length) return;
    if (postImages.length + files.length > 6) return showToast("Tối đa 6 ảnh mỗi bài!", "error");
    setUploadingImage(true);
    for (const file of files) {
      // Preview cục bộ trước
      const previewUrl = URL.createObjectURL(file);
      const tmpId = "tmp-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      setPostImages((prev) => [...prev, { url: null, preview: previewUrl, tmpId }]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(ENDPOINTS.SOCIAL.UPLOAD_IMAGE, {
          method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
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

  const submitPost = async () => {
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setPostContent(""); setSelectedMedia(null); setShowComposer(false);
        setPostImages([]); setShowMusicDropdown(false); setPostSticker(null);
        showToast("Đã đăng lên Threads D4M!");
        fetchFeed();
      } else { const d = await res.json(); showToast(d.detail || "Lỗi đăng bài", "error"); }
    } catch (e) { showToast("Mất kết nối mạng!", "error"); }
    finally { setIsSubmitting(false); }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Xóa bài này vĩnh viễn?")) return;
    try {
      const res = await fetch(ENDPOINTS.SOCIAL.POST_DELETE(postId), { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) { showToast("Đã xóa"); fetchFeed(); }
      else { const d = await res.json(); showToast(d.detail || "Lỗi xóa", "error"); }
    } catch (e) { showToast("Lỗi mạng khi xóa!", "error"); }
  };

  // Like (local toggle — có thể nâng cấp sau)
  const toggleLike = (postId) => {
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  };

  // 🧭 Điều hướng từ BottomNav — đóng mọi panel rồi thực hiện hành động
  const handleNav = (action) => {
    setShowDm(false);
    setShowActivity(false);
    setShowCustomization(false);
    setShowComposer(false);
    if (action === "home") setActiveTab("for_you");
    else if (action === "dm") setShowDm(true);
    else if (action === "create") setShowComposer(true);
    else if (action === "activity") setShowActivity(true);
    else if (action === "profile") setShowCustomization(true); // 👤 Hồ sơ & Phong cách ngay trong social
  };

  // ==========================================
  // TIỆN ÍCH
  // ==========================================
  const formatTimeAgo = (dateString) => {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };
  const getMediaUrl = (url) => url?.startsWith("http") ? url : API_BASE_URL + url;
  const handleLogout = () => { removeToken(); navigate("/auth?redirect=/social"); };
  const getAvatar = (avatar_url) => getMediaUrl(avatar_url) || EXTERNAL.PLACEHOLDER_IMG;

  // Đóng composer khi click ngoài
  useEffect(() => {
    const onClick = (e) => { if (composerRef.current && !composerRef.current.contains(e.target)) setShowMusicDropdown(false); };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // ==========================================
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

  // ==========================================
  // GIAO DIỆN CHÍNH — THREADS STYLE
  // ==========================================
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-gray-700">
      <SEO title="Social Hub" description="Mạng xã hội D4M — cập nhật trạng thái, chia sẻ âm nhạc và kết nối cộng đồng." />
      <div className="max-w-[640px] mx-auto min-h-screen flex flex-col relative">

        {/* ========== HEADER (THREADS STYLE) ========== */}
        <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 h-12">
            {/* Logo Threads */}
            <button onClick={() => navigate("/hub")} className="text-2xl font-extrabold tracking-tighter hover:opacity-70 transition">
              <span className="text-white">Threads</span>
              <span className="text-gray-500 font-light"> D4M</span>
            </button>
            {/* Icons */}
            <div className="flex items-center gap-5 text-gray-400">
              <button onClick={() => setShowCustomization(true)} className="hover:text-white transition" title="Cá nhân hóa" style={{ width: 22, height: 22 }}><span className="text-base leading-none">🎨</span></button>
              <button onClick={fetchFeed} className="hover:text-white transition" title="Làm mới" style={{ width: 22, height: 22 }}><IconRefresh /></button>
              <button onClick={handleLogout} className="hover:text-white transition" title="Đăng xuất" style={{ width: 22, height: 22 }}><IconLogout /></button>
            </div>
          </div>

          {/* Tabs: Cho bạn / Đang theo dõi */}
          <div className="flex">
            {["for_you", "following"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {tab === "for_you" ? "Cho bạn" : "Đang theo dõi"}
                <div className={`mt-2 mx-auto h-0.5 w-8 rounded-full transition ${activeTab === tab ? "bg-gray-300" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
        </header>

        {/* ========== FEED ========== */}
        <main className="flex-1 pb-20">
          {loadingFeed ? (
            <div className="space-y-6 p-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-800 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-800 rounded w-full"></div>
                    <div className="h-3 bg-gray-800 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
              <div className="text-4xl mb-3 text-gray-600">✕</div>
              <p className="font-semibold">Bảng tin trống rỗng</p>
              <p className="text-sm mt-1">Hãy tạo bài viết đầu tiên nhé!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {feed.map((post) => {
                const isOwnerOrAdmin = currentUser && (Number(currentUser.role) === 1 || post.user_id === currentUser.id);
                const liked = likedSet.has(post.post_id);
                return (
                  <article key={post.post_id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors">
                    {/* Header post */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <AvatarFrame src={post.avatar_url} frame={post.avatar_frame} pet={post.pet} treasure={post.treasure} size={40} alt="" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-bold" style={cssFrom(nameEffectStyle(post.name_effect))}>{post.fullname}</span>
                          {Number(post.role) === 1 && <span className="text-blue-500" style={{ width: 14, height: 14 }}><IconCheck /></span>}
                          <span className="text-gray-500">@{post.username} · {formatTimeAgo(post.created_at)}</span>
                        </div>

                        {/* Nội dung */}
                        {post.content && <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>}

                        {/* 🖼️ Ảnh đăng kèm (grid như Threads) + sticker GIF */}
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

                        {/* Music / Video player */}
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
                              <div className="rounded-2xl border border-white/10 bg-[#111] p-3 flex items-center gap-3">
                                <button
                                  onClick={() => togglePlay(post.post_id, getMediaUrl(post.stream_links.vocal_url))}
                                  className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shrink-0"
                                  aria-label="Phát"
                                >
                                  {playingId === post.post_id ? <IconPause /> : <IconPlay />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold truncate">{post.attached_media}</div>
                                  <div className="mt-2 h-1 bg-white/15 rounded-full cursor-pointer overflow-hidden" onClick={(e) => handleSeek(e, post.post_id)}>
                                    <div className="h-full bg-white transition-all duration-100" style={{ width: playingId === post.post_id ? `${progress}%` : "0%" }}></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action bar (Threads style) */}
                        <div className="flex items-center gap-6 mt-3 text-gray-400">
                          <button onClick={() => toggleLike(post.post_id)} className={`transition hover:scale-110 active:scale-90 ${liked ? "text-rose-500" : "hover:text-rose-400"}`} style={{ width: 22, height: 22 }}>
                            <IconHeart filled={liked} />
                          </button>
                          <button onClick={() => setCommentPost(post)} className="flex items-center gap-1 hover:text-white transition hover:scale-110 active:scale-90" title="Bình luận">
                            <span style={{ width: 22, height: 22 }} className="block"><IconComment /></span>
                            {post.comment_count > 0 && (
                              <span className="text-xs">{post.comment_count}</span>
                            )}
                          </button>
                          <button className="hover:text-white transition hover:scale-110 active:scale-90" title="Chia sẻ" style={{ width: 22, height: 22 }}>
                            <IconShare />
                          </button>
                          {isOwnerOrAdmin && (
                            <button onClick={() => deletePost(post.post_id)} className="ml-auto text-gray-600 hover:text-rose-400 transition" title="Xóa" style={{ width: 20, height: 20 }}>
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {/* ========== COMPOSER MODAL ========== */}
        {showComposer && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowComposer(false); }}>
            <div className="w-full max-w-lg bg-[#111] rounded-2xl border border-white/10 p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Tạo bài viết</h2>
                <button onClick={() => setShowComposer(false)} className="text-gray-500 hover:text-white" style={{ width: 24, height: 24 }}><IconPlus /></button>
              </div>

              <div className="flex gap-3">
                <AvatarFrame src={currentUser?.avatar_url} frame={currentUser?.avatar_frame} pet={currentUser?.pet} treasure={currentUser?.treasure} size={36} alt="" />
                <div className="flex-1">
                  <div className="text-sm font-semibold mb-1">{currentUser?.fullname}</div>
                  <textarea
                    autoFocus
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent text-white placeholder-gray-500 text-[15px] resize-none outline-none leading-relaxed"
                    placeholder="Bắt đầu một thread..."
                  />

                  {/* Preview ảnh đã chọn */}
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
                            onClick={() => setPostImages((prev) => prev.filter((p) => p.tmpId !== img.tmpId))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-rose-500"
                            aria-label="Xóa ảnh"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 🎨 Sticker đã chọn */}
                  {postSticker && (
                    <div className="mt-2 p-2 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between w-fit">
                      <img src={getMediaUrl(postSticker)} alt="Sticker" className="w-14 h-14 rounded-lg object-cover" />
                      <button onClick={() => setPostSticker(null)} className="ml-2 text-gray-500 hover:text-rose-400 p-1" aria-label="Bỏ sticker">✕</button>
                    </div>
                  )}

                  {/* Selected media */}
                  {selectedMedia && (
                    <div className="mt-2 p-2.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 text-white"><IconPlay /></div>
                        <span className="text-xs font-semibold truncate">{selectedMedia.title}</span>
                        <span className="text-[10px] text-gray-500">{selectedMedia.artist}</span>
                      </div>
                      <button onClick={() => setSelectedMedia(null)} className="text-gray-500 hover:text-rose-400 p-1" style={{ width: 20, height: 20 }}><IconPlus /></button>
                    </div>
                  )}

                  {/* Tools */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <div className="relative flex items-center">
                      {/* 🖼️ Upload ảnh */}
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage || postImages.length >= 6}
                        className="text-gray-400 hover:text-white p-2 disabled:opacity-40"
                        title="Thêm ảnh"
                        style={{ width: 30, height: 30 }}
                        aria-label="Thêm ảnh"
                      ><IconImage /></button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      {/* 🎨 Nút sticker */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowPostStickers(!showPostStickers); }}
                          className="text-gray-400 hover:text-white p-2"
                          style={{ width: 30, height: 30 }}
                          title="Sticker / GIF"
                          aria-label="Chọn sticker"
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
                      <button onClick={(e) => { e.stopPropagation(); setShowMusicDropdown(!showMusicDropdown); }} className="text-gray-400 hover:text-white p-2" style={{ width: 30, height: 30 }}><IconMessage /></button>
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
                      className="px-5 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-gray-200 transition active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? "Đang đăng..." : "Đăng"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== BOTTOM NAV (Threads style) — luôn hiển thị trên mọi phần chức năng ========== */}
        <BottomNav
          active={activeTab === "for_you"}
          dmUnread={dmUnread}
          avatarUrl={getAvatar(currentUser?.avatar_url)}
          frame={currentUser?.avatar_frame}
          pet={currentUser?.pet}
          treasure={currentUser?.treasure}
          onNavigate={handleNav}
        />

      </div>

      {/* 💬 Hộp thư DM (Threads-style) */}
      {showDm && <DmInbox currentUser={currentUser} onBack={() => setShowDm(false)} onUnreadChange={setDmUnread} onNavigate={handleNav} />}

      {/* ❤️ Bảng hoạt động (activity) */}
      {showActivity && <ActivityPanel currentUser={currentUser} onBack={() => setShowActivity(false)} onNavigate={handleNav} />}

      {/* 💬 Bảng bình luận + reply */}
      {commentPost && (
        <CommentsPanel
          post={commentPost}
          currentUser={currentUser}
          onClose={() => setCommentPost(null)}
        />
      )}

      {/* 🎨 Bảng cá nhân hóa: khung avatar, hiệu ứng tên, theme chat */}
      {showCustomization && (
        <CustomizationPanel
          currentUser={currentUser}
          onBack={() => { setShowCustomization(false); fetchFeed(); fetchMyProfile(); }}
          onNavigate={handleNav}
          onEditInfo={() => { setShowCustomization(false); navigate("/admin/profile"); }}
          onSpiritChanged={() => { fetchFeed(); fetchMyProfile(); }}
          onSaved={(updates) => {
            setCurrentUser((prev) => ({ ...prev, ...updates }));
            setShowCustomization(false);
            fetchFeed();
          }}
        />
      )}
    </div>
  );
}
