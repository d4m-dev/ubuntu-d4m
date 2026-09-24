// src/pages/social/AvatarFrame.jsx
// 🖼️ Avatar + 7 slot trang bị v2:
//    frame (khung viền) · pet (linh thú) · treasure (linh bảo) ·
//    dharma (pháp tướng) · ring (nhẫn) · sect (tông môn) · title (danh hiệu)
import { API_BASE_URL } from "../../config/urls";
import { NAME_EFFECTS } from "./socialStyles";

// Lấy URL đầy đủ cho ảnh
const full = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

// 🖼️ frame có thể là: object item v2 {image} | URL "/assets/..." | tên file legacy
export function frameSrc(frame) {
  if (!frame) return null;
  if (typeof frame === "object") return frame.image ? full(frame.image) : null;
  if (String(frame).startsWith("/")) return full(frame);
  return full(`/assets/khung/${frame}`); // legacy: tên file trong thư mục khung cũ
}

// Trả style hiệu ứng tên theo id
export function nameEffectStyle(id) {
  const eff = NAME_EFFECTS.find((e) => e.id === id) || NAME_EFFECTS[0];
  return eff.css;
}
export function nameEffectLabel(id) {
  const eff = NAME_EFFECTS.find((e) => e.id === id) || NAME_EFFECTS[0];
  return eff.label;
}

// 🏷️ Badge trang bị (ảnh nhỏ nổi quanh avatar — nền đặc, không blend)
export function SpiritBadge({ item, className, size }) {
  if (!item?.image) return null;
  return (
    <img
      src={full(item.image)}
      alt={item.name || ""}
      title={item.name ? `${item.name} (${item.rarity_label || item.rarity || ""})` : ""}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

const FALLBACK = "https://ui-avatars.com/api/?name=D&background=random&color=fff";

// Component Avatar + 7 slot trang bị
// pet/treasure/dharma/ring/sect/frame: { id, image, name, rarity } | string | null
export default function AvatarFrame({
  src, frame, pet = null, treasure = null, dharma = null,
  ring = null, sect = null, title = null, size = 40, alt = "", showSpirits = true,
}) {
  const avatarSrc = full(src) || FALLBACK;
  const fSrc = frameSrc(frame);
  const petSize = Math.max(14, Math.round(size * 0.52));
  const trSize = Math.max(10, Math.round(size * 0.38));
  const dhSize = Math.max(12, Math.round(size * 0.46));
  const smSize = Math.max(9, Math.round(size * 0.34));
  return (
    <span
      className="d4m-avatar-frame-wrap"
      style={{ width: size, height: size, borderRadius: "50%" }}
    >
      <img
        src={avatarSrc}
        alt={alt || "avatar"}
        loading="lazy"
        decoding="async"
        className="d4m-avatar"
        style={{ width: size, height: size }}
      />
      {showSpirits && dharma?.image && (
        <SpiritBadge item={dharma} className="d4m-spirit-dharma" size={dhSize} />
      )}
      {fSrc && (
        <img src={fSrc} alt="" loading="lazy" decoding="async" className="d4m-frame" />
      )}
      {showSpirits && (
        <>
          {pet?.image && <SpiritBadge item={pet} className="d4m-spirit-pet" size={petSize} />}
          {treasure?.image && <SpiritBadge item={treasure} className="d4m-spirit-treasure" size={trSize} />}
          {ring?.image && <SpiritBadge item={ring} className="d4m-spirit-ring" size={smSize} />}
          {sect?.image && <SpiritBadge item={sect} className="d4m-spirit-sect" size={smSize} />}
        </>
      )}
      {showSpirits && title?.image && size >= 36 && (
        <img
          src={full(title.image)}
          alt={title.name || ""}
          title={title.name || ""}
          loading="lazy"
          decoding="async"
          className="d4m-title-chip"
          style={{
            top: "auto",
            bottom: "104%",
            height: Math.max(18, Math.round(size * 0.5)),
            maxWidth: Math.max(84, Math.round(size * 2.6)),
            width: "auto",
          }}
        />
      )}
    </span>
  );
}
