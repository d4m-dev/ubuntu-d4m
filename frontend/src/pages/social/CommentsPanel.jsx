// src/pages/social/CommentsPanel.jsx
// 💬 Bảng bình luận + reply lồng nhau (Threads-style), hỗ trợ đăng ảnh
import { useEffect, useRef, useState } from "react";
import { SOCIAL, API_BASE_URL } from "../../config/urls";
import { getToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconImage } from "./icons";
import StickerPicker from "./StickerPicker";
import AvatarFrame, { nameEffectStyle } from "./AvatarFrame";
import { cssFrom } from "./cssUtils";

const AVATAR = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
const mediaUrl = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

const fmtAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T"));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.max(0, Math.floor(diff))}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

export default function CommentsPanel({ post, currentUser, onClose }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentImage, setCommentImage] = useState(null); // {url, preview}
  const [uploading, setUploading] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const imageInputRef = useRef(null);
  const me = currentUser?.id;

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  const loadComments = async () => {
    try {
      const res = await fetch(SOCIAL.POST_COMMENTS(post.post_id), { headers: authHeaders() });
      const data = await res.json();
      setComments(data.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(); /* eslint-disable-next-line */ }, [post.post_id]);

  // 🖼️ Chọn & upload ảnh cho bình luận / trả lời
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setCommentImage({ url: null, preview });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(SOCIAL.UPLOAD_IMAGE, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
      });
      const data = await res.json();
      if (data.status === "success") setCommentImage({ url: data.url, preview });
      else { setCommentImage(null); showToast(data.detail || "Lỗi tải ảnh", "error"); }
    } catch (err) {
      setCommentImage(null);
      showToast("Không tải được ảnh", "error");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = content.trim();
    if (!text && !commentImage?.url) return;
    if (commentImage && !commentImage.url) return showToast("Ảnh đang tải lên...", "error");
    try {
      const res = await fetch(SOCIAL.POST_COMMENTS(post.post_id), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          content: text,
          parent_id: replyTo?.id ?? null,
          image_url: commentImage?.url || null,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setContent("");
        setReplyTo(null);
        setCommentImage(null);
        await loadComments();
      } else {
        showToast(data.detail || "Lỗi khi bình luận", "error");
      }
    } catch (err) {
      showToast("Không kết nối được máy chủ", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#0a0a0a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Bình luận"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">Bình luận</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 text-lg leading-none">✕</button>
        </div>

        {/* Bài viết gốc */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex gap-3">
            <AvatarFrame src={post.avatar_url || AVATAR(post.username)} frame={post.avatar_frame} pet={post.pet} treasure={post.treasure} size={36} alt="" />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-white" style={cssFrom(nameEffectStyle(post.name_effect))}>{post.fullname || post.username}</span>
              <span className="text-xs text-gray-500 ml-1">@{post.username} · {fmtAgo(post.created_at)}</span>
              <p className="text-sm text-gray-200 mt-0.5 break-words">{post.content}</p>
              {post.images && post.images.length > 0 && (
                <div className={`mt-2 grid gap-1 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {post.images.map((url, i) => (
                    <img key={i} src={mediaUrl(url)} alt="" loading="lazy" className={`w-full object-cover rounded-lg border border-white/10 ${post.images.length === 1 ? "max-h-[300px]" : "aspect-square"}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danh sách bình luận */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-8">Đang tải...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-10">Chưa có bình luận nào. Hãy là người đầu tiên!</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="mb-4">
                <CommentRow c={c} me={me} onReply={setReplyTo} />
                {c.replies && c.replies.length > 0 && (
                  <div className="ml-12 mt-2 space-y-3 border-l border-white/10 pl-3">
                    {c.replies.map((r) => (
                      <CommentRow key={r.id} c={r} me={me} onReply={setReplyTo} small />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ô nhập bình luận */}
        <form onSubmit={submit} className="p-3 border-t border-white/10">
          {replyTo && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-white/5 text-xs text-gray-400">
              <span>Đang trả lời <b className="text-white">{replyTo.fullname || replyTo.username}</b></span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
          )}
          {/* Preview ảnh bình luận */}
          {commentImage && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <img src={commentImage.preview} alt="" className="w-full h-full object-cover" />
                {!commentImage.url && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setCommentImage(null)} className="text-gray-500 hover:text-rose-400 text-xs">Bỏ ảnh</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="text-gray-400 hover:text-white p-2 disabled:opacity-40"
              title="Đăng kèm ảnh"
              aria-label="Đăng kèm ảnh"
            ><IconImage /></button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {/* 🎨 Nút sticker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStickers(!showStickers)}
                className="text-gray-400 hover:text-white p-2"
                title="Sticker / GIF"
                aria-label="Chọn sticker"
              ><span className="text-base leading-none">😊</span></button>
              {showStickers && (
                <div className="absolute bottom-10 left-0 z-50">
                  <StickerPicker
                    onSelect={(url) => {
                      // Sticker = ảnh GIF — lưu vào image_url của comment
                      setCommentImage({ url, preview: url });
                      setShowStickers(false);
                    }}
                    onClose={() => setShowStickers(false)}
                  />
                </div>
              )}
            </div>
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={replyTo ? "Viết câu trả lời..." : "Thêm bình luận..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
            />
            <button
              type="submit"
              disabled={(!content.trim() && !commentImage?.url) || uploading}
              className="px-5 py-2.5 rounded-full bg-[#1ed760] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#3af176]"
            >
              Đăng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommentRow({ c, me, onReply, small = false }) {
  return (
    <div className="flex gap-2">
      <AvatarFrame src={c.avatar_url || AVATAR(c.username)} frame={c.avatar_frame} pet={small ? null : c.pet} treasure={small ? null : c.treasure} size={small ? 24 : 32} alt="" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-white" style={cssFrom(nameEffectStyle(c.name_effect))}>{c.fullname || c.username}</span>
          <span className="text-[10px] text-gray-500">@{c.username} · {fmtAgo(c.created_at)}</span>
        </div>
        <p className="text-sm text-gray-200 break-words">{c.content}</p>
        {c.image_url && (
          <img
            src={mediaUrl(c.image_url)}
            alt={`Ảnh bình luận của ${c.fullname || c.username}`}
            loading="lazy"
            className={`mt-1.5 rounded-xl border border-white/10 object-cover ${
              /\.gif(\?|$)/i.test(c.image_url) ? "w-16 h-16" : "w-32 h-32"
            }`}
          />
        )}
        <div className="flex items-center gap-4 mt-1">
          <button onClick={() => onReply(c)} className="text-xs text-gray-500 hover:text-gray-300">Trả lời</button>
          {c.user_id === me && <span className="text-[10px] text-gray-600">Bạn</span>}
        </div>
      </div>
    </div>
  );
}
