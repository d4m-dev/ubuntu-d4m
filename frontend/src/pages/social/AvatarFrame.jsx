// src/pages/social/AvatarFrame.jsx
// 🖼️ Avatar + khung viền GIF động + 🐉 Linh thú + 💎 Linh bảo
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

// 🏷️ Badge Linh thú / Linh bảo (ảnh nhỏ nổi quanh avatar)
export function SpiritBadge({ item, className, size }) {
  if (!item?.image) return null;
  return (
    <img
      src={full(item.image)}
      alt={item.name || ""}
      title={item.name ? `${item.name} (${item.rarity_label || item.rarity || ""})` : ""}
      loading="lazy"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

// Component Avatar có khung viền GIF động + Linh thú + Linh bảo
// pet/treasure: { id, image, name, rarity } hoặc null
const FALLBACK = "https://ui-avatars.com/api/?name=D&background=random&color=fff";
export default function AvatarFrame({ src, frame, pet = null, treasure = null, size = 40, alt = "", showSpirits = true }) {
  const avatarSrc = full(src) || FALLBACK;
  const petSize = Math.max(14, Math.round(size * 0.52));
  const trSize = Math.max(10, Math.round(size * 0.38));
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
      {showSpirits && (
        <>
          {pet?.image && (
            <SpiritBadge item={pet} className="d4m-spirit-pet" size={petSize} />
          )}
          {treasure?.image && (
            <SpiritBadge item={treasure} className="d4m-spirit-treasure" size={trSize} />
          )}
        </>
      )}
    </span>
  );
}
