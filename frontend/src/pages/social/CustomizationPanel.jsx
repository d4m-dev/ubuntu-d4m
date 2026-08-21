// src/pages/social/CustomizationPanel.jsx
// 🎨 Bảng cá nhân hóa: 🖼️ Khung viền (429) + 🐉 Linh thú + 💎 Linh bảo + ✨ Phong cách
// Thiết kế cho dữ liệu LỚN: tìm kiếm + lọc độ hiếm + phân trang ("Xem thêm").
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SOCIAL, API_BASE_URL } from "../../config/urls";
import { getToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconBack } from "./icons";
import { NAME_EFFECTS, CHAT_THEMES } from "./socialStyles";
import { nameEffectStyle } from "./AvatarFrame";
import AvatarFrame from "./AvatarFrame";

// 🏷️ Màu theo độ hiếm
const RARITY = {
  common:    { label: "Thường",      color: "#9ca3af", border: "#4b5563" },
  rare:      { label: "Hiếm",        color: "#38bdf8", border: "#0284c7" },
  epic:      { label: "Sử thi",      color: "#c084fc", border: "#9333ea" },
  legendary: { label: "Huyền thoại", color: "#fbbf24", border: "#d97706" },
};
const rarityOf = (r) => RARITY[r] || RARITY.common;
const RARITY_CHIPS = [["all", "Tất cả"], ["common", "Thường"], ["rare", "Hiếm"], ["epic", "Sử thi"], ["legendary", "Huyền thoại"]];

const full = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

// 🔎 Thanh tìm kiếm + chip độ hiếm + nút xem thêm (dùng chung cho khung & linh vật)
function FilterBar({ query, onQuery, rarity, onRarity, counts, placeholder }) {
  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-[#1ed760]/60"
      />
      <div className="flex gap-1.5 flex-wrap">
        {RARITY_CHIPS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onRarity(id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${rarity === id ? "bg-white/15 text-white border-white/40" : "text-gray-400 border-white/10 hover:border-white/30"}`}
            style={id !== "all" && rarity !== id ? { color: rarityOf(id).color } : {}}
          >
            {label}{id !== "all" && counts[id] ? ` ${counts[id]}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadMore({ shown, total, onMore }) {
  if (shown >= total) return null;
  return (
    <button
      onClick={onMore}
      className="w-full py-2 rounded-full text-xs font-bold bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
    >
      Xem thêm ({total - shown} còn lại)
    </button>
  );
}

export default function CustomizationPanel({ currentUser, onBack, onSaved, onSpiritChanged, onEditInfo }) {
  const [tab, setTab] = useState("frame"); // frame | pet | treasure | style
  // 🖼️ Khung viền
  const [frames, setFrames] = useState([]);
  const [frame, setFrame] = useState(currentUser?.avatar_frame || null);
  const [frameQuery, setFrameQuery] = useState("");
  const [frameRarity, setFrameRarity] = useState("all");
  const [frameLimit, setFrameLimit] = useState(60);
  // ✨ Phong cách
  const [effect, setEffect] = useState(currentUser?.name_effect || "default");
  const [theme, setTheme] = useState(currentUser?.chat_theme || "default");
  const [saving, setSaving] = useState(false);
  // 🐉💎 Linh thú & Linh bảo
  const [catalog, setCatalog] = useState([]);
  const [xu, setXu] = useState(0);
  const [equipped, setEquipped] = useState({ pet: null, treasure: null });
  const [busyId, setBusyId] = useState(null);
  const [spiritQuery, setSpiritQuery] = useState("");
  const [spiritRarity, setSpiritRarity] = useState("all");
  const [spiritLimit, setSpiritLimit] = useState(24);

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  const loadSpirits = async () => {
    try {
      const [catRes, meRes] = await Promise.all([
        fetch(SOCIAL.SPIRIT_CATALOG, { headers: authHeaders() }),
        fetch(SOCIAL.SPIRIT_ME, { headers: authHeaders() }),
      ]);
      const cat = await catRes.json();
      const me = await meRes.json();
      setCatalog(cat.data || []);
      if (me.data) {
        setXu(me.data.xu || 0);
        setEquipped({ pet: me.data.equipped_pet, treasure: me.data.equipped_treasure });
      }
    } catch (e) { /* im lặng */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(SOCIAL.AVATAR_FRAMES);
        const data = await res.json();
        setFrames(data.data || []);
      } catch (e) { setFrames([]); }
    })();
    loadSpirits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 💾 Lưu khung viền + hiệu ứng tên + theme chat
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

  // 🛒 Mua linh vật bằng Xu
  const buy = async (item) => {
    setBusyId(item.id);
    try {
      const res = await fetch(SOCIAL.SPIRIT_BUY, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ item_id: item.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(data.message || "Đã mua!");
        await loadSpirits();
        onSpiritChanged?.();
      } else showToast(data.detail || "Mua thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // ⚔️ Trang bị / tháo
  const toggleEquip = async (item) => {
    const isEquipped = equipped[item.kind] === item.id;
    setBusyId(item.id);
    try {
      const url = isEquipped ? SOCIAL.SPIRIT_UNEQUIP : SOCIAL.SPIRIT_EQUIP;
      const body = isEquipped ? { kind: item.kind } : { item_id: item.id };
      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.status === "success") {
        showToast(isEquipped ? "Đã tháo trang bị" : data.message || "Đã trang bị!");
        await loadSpirits();
        onSpiritChanged?.();
      } else showToast(data.detail || "Thao tác thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // ============ 🖼️ LỌC KHUNG ============
  const frameCounts = useMemo(() => {
    const c = { common: 0, rare: 0, epic: 0, legendary: 0 };
    frames.forEach((f) => { c[f.rarity] = (c[f.rarity] || 0) + 1; });
    return c;
  }, [frames]);
  const filteredFrames = useMemo(() => {
    const q = frameQuery.trim().toLowerCase();
    return frames.filter((f) =>
      (frameRarity === "all" || f.rarity === frameRarity) &&
      (!q || (f.label || f.name).toLowerCase().includes(q)));
  }, [frames, frameQuery, frameRarity]);
  const visibleFrames = filteredFrames.slice(0, frameLimit);

  // ============ 🐉💎 LỌC LINH VẬT ============
  const spiritCounts = useMemo(() => {
    const c = { common: 0, rare: 0, epic: 0, legendary: 0 };
    catalog.forEach((i) => { c[i.rarity] = (c[i.rarity] || 0) + 1; });
    return c;
  }, [catalog]);
  const filterSpirits = (kind) => {
    const q = spiritQuery.trim().toLowerCase();
    return catalog.filter((i) =>
      i.kind === kind &&
      (spiritRarity === "all" || i.rarity === spiritRarity) &&
      (!q || i.name.toLowerCase().includes(q)));
  };

  // 🖼️ Preview tổng hợp (khung đang chọn + linh thú/linh bảo đang trang bị)
  const petItem = catalog.find((i) => i.id === equipped.pet) || null;
  const treasureItem = catalog.find((i) => i.id === equipped.treasure) || null;

  const TABS = [
    { id: "frame", label: `🖼️ Khung (${frames.length})` },
    { id: "pet", label: "🐉 Linh thú" },
    { id: "treasure", label: "💎 Linh bảo" },
    { id: "style", label: "✨ Phong cách" },
  ];

  const renderSpiritTab = (kind) => {
    const items = filterSpirits(kind);
    const visible = items.slice(0, spiritLimit);
    const ownedCount = catalog.filter((i) => i.kind === kind && i.owned).length;
    const totalCount = catalog.filter((i) => i.kind === kind).length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Kho của bạn: <b className="text-white">{ownedCount}/{totalCount}</b></span>
          <span className="px-2.5 py-1 rounded-full bg-[#1ed760]/10 text-[#1ed760] font-bold">🪙 {xu.toLocaleString("vi-VN")} Xu</span>
        </div>
        <FilterBar
          query={spiritQuery} onQuery={(v) => { setSpiritQuery(v); setSpiritLimit(24); }}
          rarity={spiritRarity} onRarity={(r) => { setSpiritRarity(r); setSpiritLimit(24); }}
          counts={spiritCounts} placeholder={`Tìm ${kind === "pet" ? "linh thú" : "linh bảo"}...`}
        />
        <div className="grid grid-cols-2 gap-3">
          {visible.map((item) => {
            const rar = rarityOf(item.rarity);
            const isEquipped = equipped[kind] === item.id;
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border-2 p-3 text-center transition ${isEquipped ? "bg-white/[0.07]" : "bg-white/[0.02]"}`}
                style={{ borderColor: isEquipped ? "#1ed760" : rar.border }}
              >
                <div className="relative inline-block">
                  <img
                    src={full(item.image)} alt={item.name} loading="lazy"
                    className="w-20 h-20 mx-auto object-contain rounded-xl"
                    style={{ mixBlendMode: "screen", background: "radial-gradient(circle, rgba(255,255,255,.06), transparent 70%)" }}
                  />
                  {isEquipped && <span className="absolute -top-1 -right-1 text-[10px] bg-[#1ed760] text-black font-bold rounded-full px-1.5">✓</span>}
                </div>
                <div className="mt-2 text-sm font-bold text-white truncate">{item.name}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: rar.color }}>{rar.label}</div>
                {item.description && <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{item.description}</div>}
                <div className="mt-2">
                  {item.owned ? (
                    <button
                      onClick={() => toggleEquip(item)}
                      disabled={busy}
                      className={`w-full py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${isEquipped ? "bg-white/10 text-gray-300 hover:bg-white/20" : "bg-[#1ed760] text-black hover:brightness-110"}`}
                    >
                      {busy ? "..." : isEquipped ? "Tháo" : "Trang bị"}
                    </button>
                  ) : (
                    <button
                      onClick={() => buy(item)}
                      disabled={busy || xu < item.price_xu}
                      className="w-full py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title={xu < item.price_xu ? "Không đủ Xu" : ""}
                    >
                      {busy ? "..." : `🪙 ${Number(item.price_xu || 0).toLocaleString("vi-VN")}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 text-sm py-8">Không tìm thấy linh vật phù hợp.</div>
          )}
        </div>
        <LoadMore shown={visible.length} total={items.length} onMore={() => setSpiritLimit((n) => n + 24)} />
        <p className="text-[11px] text-gray-500">💡 Trang bị có hiệu lực ngay — hiển thị cạnh avatar của bạn ở mọi nơi: bảng tin, bình luận, tin nhắn.</p>
      </div>
    );
  };

  // 🌀 Portal ra body — thoát ancestor backdrop-filter/transform, căn giữa an toàn
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex overflow-y-auto p-4" onClick={onBack}>
      <div className="w-full max-w-md m-auto bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300"><IconBack /></button>
          <h2 className="font-bold text-lg flex-1">Hồ sơ & Phong cách</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-[#1ed760]/10 text-[#1ed760] font-bold">🪙 {xu.toLocaleString("vi-VN")}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 border-b border-white/10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl whitespace-nowrap transition ${tab === t.id ? "bg-white/10 text-white border-b-2 border-[#1ed760]" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 👤 HEADER HỒ SƠ — preview trực tiếp mọi thứ đang chọn */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <AvatarFrame src={currentUser?.avatar_url} frame={frame} pet={petItem} treasure={treasureItem} size={88} alt="" />
            <div className="mt-3 text-lg font-bold" style={{ ...cssFrom(nameEffectStyle(effect)) }}>
              {currentUser?.fullname || currentUser?.username}
            </div>
            <div className="text-xs text-gray-500">
              @{currentUser?.username}
              {Number(currentUser?.role) === 1 && <span className="text-blue-400"> · Admin</span>}
            </div>
            {(petItem || treasureItem) && (
              <div className="flex justify-center gap-2 mt-2 flex-wrap">
                {petItem && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[11px] font-bold">🐉 {petItem.name}</span>
                )}
                {treasureItem && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-bold">💎 {treasureItem.name}</span>
                )}
              </div>
            )}
            {onEditInfo && (
              <button onClick={onEditInfo} className="mt-3 text-[11px] text-gray-400 underline hover:text-white transition">
                Sửa thông tin cơ bản (tên, SĐT, địa chỉ...)
              </button>
            )}
            <p className="mt-2 text-[10px] text-gray-600">
              Mọi thay đổi hiện toàn hệ thống: bảng tin, bình luận, tin nhắn, hồ sơ.
            </p>
          </div>

          {/* 🖼️ TAB KHUNG VIỀN (429 khung: tìm kiếm + lọc hiếm + phân trang) */}
          {tab === "frame" && (
            <div className="space-y-3">
              <FilterBar
                query={frameQuery} onQuery={(v) => { setFrameQuery(v); setFrameLimit(60); }}
                rarity={frameRarity} onRarity={(r) => { setFrameRarity(r); setFrameLimit(60); }}
                counts={frameCounts} placeholder={`Tìm trong ${frames.length} khung viền...`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFrame(null)}
                  className={`w-12 h-12 rounded-full border-2 ${!frame ? "border-[#1ed760]" : "border-white/15"} bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10`}
                  title="Không khung"
                >✕</button>
                {visibleFrames.map((f) => {
                  const rar = rarityOf(f.rarity);
                  return (
                    <button
                      key={f.name}
                      onClick={() => setFrame(f.name)}
                      className={`w-12 h-12 rounded-full border-2 overflow-hidden transition ${frame === f.name ? "border-[#1ed760]" : "hover:border-white/40"}`}
                      style={frame === f.name ? {} : { borderColor: rar.border }}
                      title={`${f.label || f.name} · ${rar.label}`}
                    >
                      <img src={SOCIAL.AVATAR_FRAME_FILE(f.name)} alt={f.label || f.name} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
                {filteredFrames.length === 0 && (
                  <div className="w-full text-center text-gray-500 text-sm py-6">Không tìm thấy khung phù hợp.</div>
                )}
              </div>
              <LoadMore shown={visibleFrames.length} total={filteredFrames.length} onMore={() => setFrameLimit((n) => n + 60)} />
              <button onClick={save} disabled={saving} className="w-full py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 disabled:opacity-50 text-sm">
                {saving ? "Đang lưu..." : "Lưu khung viền"}
              </button>
            </div>
          )}

          {/* 🐉 TAB LINH THÚ */}
          {tab === "pet" && renderSpiritTab("pet")}

          {/* 💎 TAB LINH BẢO */}
          {tab === "treasure" && renderSpiritTab("treasure")}

          {/* ✨ TAB PHONG CÁCH (hiệu ứng tên + theme chat) */}
          {tab === "style" && (
            <>
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

              <button onClick={save} disabled={saving} className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 disabled:opacity-50">
                {saving ? "Đang lưu..." : "Lưu phong cách"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
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
      const camel = k.replace(/-([a-z])/, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
