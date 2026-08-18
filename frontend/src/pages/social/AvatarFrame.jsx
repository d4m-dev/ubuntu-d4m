// src/pages/social/AvatarFrame.jsx
// 🖼️ Avatar + khung viền GIF động (từ github d4m-dev/gif)
import { API_BASE_URL } from "../../config/urls";
import { NAME_EFFECTS } from "./socialStyles";

// Lấy URL đầy đủ cho ảnh
const full = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

// Trả style hiệu ứng tên theo id
export function nameEffectStyle(id) {
  const eff = NAME_EFFECTS.find((e) => e.id === id) || NAME_EFFECTS[0];
  return eff.css;
}
export function nameEffectLabel(id) {
  const eff = NAME_EFFECTS.find((e) => e.id === id) || NAME_EFFECTS[0];
  return eff.label;
}

// Component Avatar có khung viền GIF động
const FALLBACK = "https://ui-avatars.com/api/?name=D&background=random&color=fff";
export default function AvatarFrame({ src, frame, size = 40, alt = "" }) {
  const avatarSrc = full(src) || FALLBACK;
  return (
    <span
      className="d4m-avatar-frame-wrap"
      style={{ width: size, height: size, borderRadius: "50%" }}
    >
      <img
        src={avatarSrc}
        alt={alt || "avatar"}
        loading="lazy"
        className="d4m-avatar"
        style={{ width: size, height: size }}
      />
      {frame && (
        <img
          src={full(`/avatar_frames/${frame}`)}
          alt=""
          loading="lazy"
          className="d4m-frame"
        />
      )}
    </span>
  );
}
