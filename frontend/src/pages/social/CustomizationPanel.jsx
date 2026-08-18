// src/pages/social/CustomizationPanel.jsx
// 🎨 Bảng cá nhân hóa: khung avatar (GIF), hiệu ứng tên, theme chat
import { useEffect, useState } from "react";
import { SOCIAL, API_BASE_URL } from "../../config/urls";
import { getToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconBack } from "./icons";
import { NAME_EFFECTS, CHAT_THEMES } from "./socialStyles";
import { nameEffectStyle } from "./AvatarFrame";
import AvatarFrame from "./AvatarFrame";

export default function CustomizationPanel({ currentUser, onBack, onSaved, onNavigate }) {
  const [frames, setFrames] = useState([]);
  const [frame, setFrame] = useState(currentUser?.avatar_frame || null);
  const [effect, setEffect] = useState(currentUser?.name_effect || "default");
  const [theme, setTheme] = useState(currentUser?.chat_theme || "default");
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  useEffect(() => {
    (async () => {
      try {
        // manifest tĩnh từ frontend/public/avatar_frames.json — không cần auth
        const res = await fetch(SOCIAL.AVATAR_FRAMES);
        const data = await res.json();
        setFrames(data.data || []);
      } catch (e) { setFrames([]); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ avatar_frame: frame, name_effect: effect, chat_theme: theme }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast("Đã lưu phong cách!");
        onSaved?.({ avatar_frame: frame, name_effect: effect, chat_theme: theme });
      } else showToast(data.detail || "Lỗi lưu", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onBack}>
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300"><IconBack /></button>
          <h2 className="font-bold text-lg flex-1">Cá nhân hóa</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Preview */}
          <div className="text-center">
            <AvatarFrame src={currentUser?.avatar_url} frame={frame} size={80} alt="" />
            <div className="mt-2 text-lg" style={{ ...cssFrom(nameEffectStyle(effect)) }}>{currentUser?.fullname || currentUser?.username}</div>
          </div>

          {/* Khung avatar */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Khung viền Avatar ({frames.length})</div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFrame(null)}
                className={`w-12 h-12 rounded-full border-2 ${!frame ? "border-[#1ed760]" : "border-white/15"} bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10`}
                title="Không khung"
              >✕</button>
              {frames.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setFrame(f.name)}
                  className={`w-12 h-12 rounded-full border-2 overflow-hidden ${frame === f.name ? "border-[#1ed760]" : "border-white/15"} hover:border-white/40`}
                  title={f.name}
                >
                  <img src={SOCIAL.AVATAR_FRAME_FILE(f.name)} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Hiệu ứng tên */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Hiệu ứng tên</div>
            <div className="grid grid-cols-2 gap-2">
              {NAME_EFFECTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEffect(e.id)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-bold ${effect === e.id ? "border-[#1ed760] bg-white/10" : "border-white/15 hover:border-white/30"}`}
                  style={cssFrom(e.css)}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme chat */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Khung chat (Messenger)</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CHAT_THEMES).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-left ${theme === id ? "border-[#1ed760]" : "border-white/15 hover:border-white/30"}`}
                >
                  <div className="text-xs font-semibold" style={{ color: t.theirsColor }}>{t.label}</div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: t.theirsBg, color: t.theirsColor }}>Bạn</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: t.mineBg, color: t.mineColor }}>Tôi</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={save} disabled={saving} className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu phong cách"}
          </button>
        </div>
      </div>
    </div>
  );
}

// chuyển string CSS thành object (inline style)
function cssFrom(str) {
  const obj = {};
  (str || "").split(";").forEach((decl) => {
    const i = decl.indexOf(":");
    if (i > 0) {
      const k = decl.slice(0, i).trim();
      const v = decl.slice(i + 1).trim();
      // convert kebab to camel
      const camel = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
