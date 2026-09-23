// src/pages/social/CustomizationPanel.jsx
// 🎨 HỒ SƠ & PHONG CÁCH v2 — 7 slot trang bị + ✨ Phong cách
//    🖼️ Khung (607) · 🐉 Linh thú (36) · 💎 Linh bảo (158) · 🔥 Pháp tướng (93)
//    🏷️ Danh hiệu (19) · 💍 Nhẫn (19) · ⛩️ Tông môn (64)
// 🛡️ HARDENED: preview CỐ ĐỊNH 1 chỗ, chạm để ƯỚM THỬ trước khi mua,
//    search + lọc hiếm + phân trang, a11y đầy đủ.
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

// 7 tab vật phẩm (kind → nhãn)
const KIND_TABS = [
  { kind: "frame",    icon: "🖼️", label: "Khung" },
  { kind: "pet",      icon: "🐉", label: "Linh thú" },
  { kind: "treasure", icon: "💎", label: "Linh bảo" },
  { kind: "dharma",   icon: "🔥", label: "Pháp tướng" },
  { kind: "title",    icon: "🏷️", label: "Danh hiệu" },
  { kind: "ring",     icon: "💍", label: "Nhẫn" },
  { kind: "sect",     icon: "⛩️", label: "Tông môn" },
];
const KIND_LABEL = Object.fromEntries(KIND_TABS.map((t) => [t.kind, t.label]));

const full = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

// 🔎 Thanh tìm kiếm + chip độ hiếm (dùng chung)
function FilterBar({ query, onQuery, rarity, onRarity, counts, placeholder }) {
  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-[#1ed760]/60"
      />
      <div className="flex gap-1.5 flex-wrap">
        {RARITY_CHIPS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onRarity(id)}
            aria-pressed={rarity === id}
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
  const [tab, setTab] = useState("frame"); // 7 kind + "style"
  // ✨ Phong cách
  const [effect, setEffect] = useState(currentUser?.name_effect || "default");
  const [theme, setTheme] = useState(currentUser?.chat_theme || "default");
  const [saving, setSaving] = useState(false);
  // 🗂️ Catalog v2 (7 loại)
  const [catalog, setCatalog] = useState([]);
  const [xu, setXu] = useState(0);
  const [equipped, setEquipped] = useState({}); // {kind: item_id}
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const [limit, setLimit] = useState(24);
  // 🧪 ướm thử (mỗi slot 1 món)
  const [trying, setTrying] = useState({});

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  const loadData = async () => {
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
        setEquipped(me.data.equipped || {
          pet: me.data.equipped_pet, treasure: me.data.equipped_treasure,
        });
      }
    } catch (e) { /* im lặng */ }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // 💾 Lưu hiệu ứng tên + theme chat (có lock chống spam)
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/update`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ name_effect: effect, chat_theme: theme }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast("Đã lưu phong cách!");
        onSaved?.({ name_effect: effect, chat_theme: theme });
      } else showToast(data.detail || "Lỗi lưu", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setSaving(false); }
  };

  // 🛒 Mua vật phẩm bằng Xu
  const buy = async (item) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const res = await fetch(SOCIAL.SPIRIT_BUY, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ item_id: item.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(data.message || "Đã mua!");
        await loadData();
        onSpiritChanged?.();
      } else showToast(data.detail || "Mua thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // ⚔️ Trang bị / tháo
  const toggleEquip = async (item) => {
    if (busyId) return;
    const isEquipped = equipped[item.kind] === item.id;
    setBusyId(item.id);
    try {
      const url = isEquipped ? SOCIAL.SPIRIT_UNEQUIP : SOCIAL.SPIRIT_EQUIP;
      const body = isEquipped ? { kind: item.kind } : { item_id: item.id };
      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.status === "success") {
        showToast(isEquipped ? "Đã tháo trang bị" : data.message || "Đã trang bị!");
        await loadData();
        onSpiritChanged?.();
      } else showToast(data.detail || "Thao tác thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // 🧪 Ướm thử — chạm thẻ để xem trước lên avatar preview
  const tryOn = (item) => {
    setTrying((t) => ({ ...t, [item.kind]: t[item.kind]?.id === item.id ? null : item }));
  };

  // ============ LỌC THEO TAB ============
  const kindItems = useMemo(() => catalog.filter((i) => i.kind === tab), [catalog, tab]);
  const counts = useMemo(() => {
    const c = { common: 0, rare: 0, epic: 0, legendary: 0 };
    kindItems.forEach((i) => { c[i.rarity] = (c[i.rarity] || 0) + 1; });
    return c;
  }, [kindItems]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kindItems.filter((i) =>
      (rarity === "all" || i.rarity === rarity) &&
      (!q || i.name.toLowerCase().includes(q)));
  }, [kindItems, query, rarity]);
  const visible = filtered.slice(0, limit);

  const switchTab = (id) => {
    setTab(id); setQuery(""); setRarity("all"); setLimit(24); setTrying({});
  };

  // 🖼️ Preview: đồ ĐANG EQUIP, đè bởi đồ ĐANG ƯỚM THỬ
  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog]);
  const previewItem = (kind) => trying[kind] || byId.get(equipped[kind]) || null;
  const preview = {
    frame: previewItem("frame"), pet: previewItem("pet"), treasure: previewItem("treasure"),
    dharma: previewItem("dharma"), title: previewItem("title"), ring: previewItem("ring"),
    sect: previewItem("sect"),
  };
  const isTrying = Object.values(trying).some(Boolean);

  const TABS = [
    ...KIND_TABS.map((t) => ({
      id: t.kind,
      label: `${t.icon} ${t.label} (${catalog.filter((i) => i.kind === t.kind).length})`,
    })),
    { id: "style", label: "✨ Phong cách" },
  ];

  const renderItemTab = () => {
    const kindLabel = KIND_LABEL[tab] || tab;
    const ownedCount = kindItems.filter((i) => i.owned).length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Kho của bạn: <b className="text-white">{ownedCount}/{kindItems.length}</b></span>
          <span className="px-2.5 py-1 rounded-full bg-[#1ed760]/10 text-[#1ed760] font-bold">🪙 {xu.toLocaleString("vi-VN")} Xu</span>
        </div>
        <FilterBar
          query={query} onQuery={(v) => { setQuery(v); setLimit(24); }}
          rarity={rarity} onRarity={(r) => { setRarity(r); setLimit(24); }}
          counts={counts} placeholder={`Tìm ${kindLabel.toLowerCase()}...`}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((item) => {
            const rar = rarityOf(item.rarity);
            const isEquipped = equipped[item.kind] === item.id;
            const isTry = trying[item.kind]?.id === item.id;
            const busy = busyId === item.id;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => tryOn(item)}
                aria-pressed={isTry}
                aria-label={`Ướm thử ${item.name}`}
                onKeyDown={(e) => { if (e.key === "Enter") tryOn(item); }}
                className={`relative rounded-2xl border-2 p-3 text-center transition cursor-pointer hover:bg-white/[0.06] ${isEquipped ? "bg-white/[0.07]" : "bg-white/[0.02]"}`}
                style={{ borderColor: isEquipped ? "#1ed760" : isTry ? "#e5e7eb" : rar.border }}
                title="Chạm để ướm thử lên avatar"
              >
                {isTry && !isEquipped && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/70 border border-white/30 rounded-full px-1.5 py-0.5">🧪 thử</span>
                )}
                <div className="relative inline-block">
                  <img
                    src={full(item.image)} alt={item.name} loading="lazy" decoding="async"
                    className="w-20 h-20 mx-auto object-contain rounded-full"
                    style={{ background: "radial-gradient(circle at 50% 38%, #1c2440, #0a0d18 72%)", border: "2px solid rgba(255,255,255,.25)" }}
                  />
                  {isEquipped && <span className="absolute -top-1 -right-1 text-[10px] bg-[#1ed760] text-black font-bold rounded-full px-1.5">✓</span>}
                </div>
                <div className="mt-2 text-sm font-bold text-white truncate">{item.name}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: rar.color }}>{rar.label}</div>
                {item.description && <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{item.description}</div>}
                <div className="mt-2">
                  {item.owned ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleEquip(item); }}
                      disabled={busy}
                      className={`w-full py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${isEquipped ? "bg-white/10 text-gray-300 hover:bg-white/20" : "bg-[#1ed760] text-black hover:brightness-110"}`}
                    >
                      {busy ? "..." : isEquipped ? "Tháo" : "Trang bị"}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); buy(item); }}
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
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-500 text-sm py-8">Không tìm thấy vật phẩm phù hợp.</div>
          )}
        </div>
        <LoadMore shown={visible.length} total={filtered.length} onMore={() => setLimit((n) => n + 24)} />
        <p className="text-[11px] text-gray-500">🧪 Chạm thẻ để ướm thử lên avatar trước khi mua • Trang bị có hiệu lực ngay toàn hệ thống.</p>
      </div>
    );
  };

  // 🌀 Portal ra body — thoát ancestor backdrop-filter/transform, căn giữa an toàn
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex overflow-y-auto p-4" onClick={onBack} role="dialog" aria-modal="true" aria-label="Hồ sơ và phong cách">
      <div className="w-full max-w-md md:max-w-5xl m-auto bg-[#0d0d10] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[92dvh] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300"><IconBack /></button>
          <h2 className="font-bold text-lg flex-1">Hồ sơ & Phong cách</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-[#1ed760]/10 text-[#1ed760] font-bold">🪙 {xu.toLocaleString("vi-VN")}</span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* 👤 CỘT TRÁI: preview cố định */}
        <div className="shrink-0 md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-white/10 p-3 md:p-4 bg-white/[0.02] md:overflow-y-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] py-5 px-6 md:px-8 text-center">
            <AvatarFrame
              src={currentUser?.avatar_url}
              frame={preview.frame} pet={preview.pet} treasure={preview.treasure}
              dharma={preview.dharma} title={preview.title} ring={preview.ring} sect={preview.sect}
              size={80} alt=""
            />
            <div className="mt-3 text-base md:text-lg font-bold" style={{ ...cssFrom(nameEffectStyle(effect)) }}>
              {currentUser?.fullname || currentUser?.username}
            </div>
            <div className="text-xs text-gray-500">
              @{currentUser?.username}
              {Number(currentUser?.role) === 1 && <span className="text-blue-400"> · Admin</span>}
            </div>
            {(preview.pet || preview.treasure || preview.dharma) && (
              <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                {preview.dharma && <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-bold">🔥 {preview.dharma.name}</span>}
                {preview.pet && <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[11px] font-bold">🐉 {preview.pet.name}</span>}
                {preview.treasure && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-bold">💎 {preview.treasure.name}</span>}
              </div>
            )}
            {isTrying && (
              <p className="mt-1.5 text-[10px] text-[#1ed760] font-bold">🧪 Đang ướm thử — mua/trang bị bằng nút trong thẻ</p>
            )}
            {onEditInfo && (
              <button onClick={onEditInfo} className="mt-2 text-[11px] text-gray-400 underline hover:text-white transition">
                Sửa thông tin cơ bản (tên, SĐT, địa chỉ...)
              </button>
            )}
            <p className="mt-1.5 text-[10px] text-gray-600">
              Chạm vật phẩm để xem trước • mọi thay đổi hiện toàn hệ thống.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 border-b border-white/10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              aria-pressed={tab === t.id}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl whitespace-nowrap transition ${tab === t.id ? "bg-white/10 text-white border-b-2 border-[#1ed760]" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* 7 TAB VẬT PHẨM */}
          {tab !== "style" && renderItemTab()}

          {/* ✨ TAB PHONG CÁCH */}
          {tab === "style" && (
            <>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Hiệu ứng tên</div>
                <div className="grid grid-cols-2 gap-2">
                  {NAME_EFFECTS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEffect(e.id)}
                      aria-pressed={effect === e.id}
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
                      aria-pressed={theme === id}
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
            </>
          )}
        </div>

        {/* 📌 Nút LƯU cố định đáy — chỉ tab phong cách */}
        {tab === "style" && (
          <div className="p-3 border-t border-white/10 bg-[#111] shrink-0">
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              {saving ? "Đang lưu..." : "Lưu phong cách"}
            </button>
          </div>
        )}
        </div>
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
      const camel = k.replace(/-([a-z])/, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
