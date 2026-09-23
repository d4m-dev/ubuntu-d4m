// src/pages/social/RealmName.jsx
// 🧘 Tên đạo hữu hiển thị theo CẢNH GIỚI (font + GIF text-masking từ tu-vi-sys.json)
// realmIndex = 0 (Phàm Nhân) hoặc chưa tải xong → fallback hiệu ứng tên thường.
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config/urls";
import { nameEffectStyle } from "./AvatarFrame";

let REALMS = null;
const FONT_INJECTED = new Set();

const norm = (r, i) => {
  const fix = (v) => (v && v.startsWith("./") ? API_BASE_URL + "/assets/tu-vi/" + v.slice(2) : v ? (v.startsWith("http") ? v : API_BASE_URL + v) : v);
  return { ...r, index: i, font_file: fix(r.font_file), bg_gif: fix(r.bg_gif) };
};

export async function fetchRealms() {
  if (REALMS) return REALMS;
  try {
    const res = await fetch(`${API_BASE_URL}/assets/tu-vi/tu-vi-sys.json`);
    const d = await res.json();
    REALMS = (d.realms || []).map(norm);
  } catch (e) {
    REALMS = [];
  }
  return REALMS;
}

export function injectRealmFont(realm) {
  if (!realm?.font_file || FONT_INJECTED.has(realm.font_file)) return;
  FONT_INJECTED.add(realm.font_file);
  const fam = `TierFont${realm.index}`;
  const st = document.createElement("style");
  st.textContent = `@font-face{font-family:'${fam}';src:url('${realm.font_file}') format('truetype'),url('${realm.font_file}') format('opentype');font-display:swap;}`;
  document.head.appendChild(st);
}

// 🎭 Tên đạo hữu — cảnh giới cao dùng text-masking, phàm nhân dùng name effect
export default function RealmName({ realmIndex = 0, spiritRoot = null, effectId, name, className = "", style = {} }) {
  const [realms, setRealms] = useState(REALMS);
  useEffect(() => {
    if (!REALMS) fetchRealms().then(setRealms);
  }, []);

  const idx = Number(realmIndex || 0);
  const realm = realms && idx > 0 ? realms[Math.min(idx, realms.length - 1)] : null;

  if (!realm) {
    return (
      <span className={`font-bold ${className}`} style={{ ...style, ...cssOf(nameEffectStyle(effectId)) }}>
        {name}
      </span>
    );
  }
  injectRealmFont(realm);
  const te = realm.text_effect || {};
  return (
    <span
      className={`dao-huu-name ${className}`}
      style={{
        ...style,
        fontFamily: `'TierFont${realm.index}', sans-serif`,
        "--tier-gif": realm.bg_gif ? `url('${realm.bg_gif}')` : undefined,
        "--tier-gradient": te.fallback_gradient,
        "--tier-fallback-color": te.fallback_color,
        "--tier-glow": te.glow_shadow,
      }}
      title={`Cảnh giới: ${realm.display_title}`}
    >
      {name}
    </span>
  );
}

// 🏷️ Chip cảnh giới nhỏ (dùng ở profile / thẻ user)
export function RealmBadge({ realmIndex = 0, className = "" }) {
  const [realms, setRealms] = useState(REALMS);
  useEffect(() => {
    if (!REALMS) fetchRealms().then(setRealms);
  }, []);
  const idx = Number(realmIndex || 0);
  const realm = realms && idx > 0 ? realms[Math.min(idx, realms.length - 1)] : null;
  if (!realm) return null;
  const te = realm.text_effect || {};
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${className}`}
      style={{ color: te.fallback_color, borderColor: te.fallback_color + "66", background: (te.fallback_color || "#fff") + "14" }}
      title={realm.lore || realm.display_title}
    >
      ☯ {realm.display_title}
    </span>
  );
}

function cssOf(str) {
  const obj = {};
  (str || "").split(";").forEach((decl) => {
    const i = decl.indexOf(":");
    if (i > 0) {
      const k = decl.slice(0, i).trim();
      const v = decl.slice(i + 1).trim();
      const camel = k.replace(/-([a-z])/, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
