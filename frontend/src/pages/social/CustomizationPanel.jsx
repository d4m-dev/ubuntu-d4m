// src/pages/social/CustomizationPanel.jsx
// ⚔️ BẢO KHỐ TRANG BỊ v3 — phong cách TU TIÊN / KIẾM HIỆP
// Layout đồng nhất với trang Hồ sơ định danh (/admin/profile):
//   • Cột trái: đạo hồ preview (avatar 7 slot + tên + chip trang bị)
//   • Cột phải: Tổng quan 7 slot + tabs danh mục + Phong cách
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SOCIAL, API_BASE_URL } from "../../config/urls";
import { getToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconBack } from "./icons";
import { NAME_EFFECTS, CHAT_THEMES } from "./socialStyles";
import { nameEffectStyle } from "./AvatarFrame";
import AvatarFrame from "./AvatarFrame";

// 🏷️ Phẩm chất theo độ hiếm
const RARITY = {
  common:    { label: "Phàm Phẩm",     color: "#9ca3af", cls: "x-rarity-common" },
  rare:      { label: "Linh Phẩm",     color: "#38bdf8", cls: "x-rarity-rare" },
  epic:      { label: "Huyền Phẩm",    color: "#c084fc", cls: "x-rarity-epic" },
  legendary: { label: "Thần Phẩm",     color: "#f5c15c", cls: "x-rarity-legendary" },
};
const rarityOf = (r) => RARITY[r] || RARITY.common;
const RARITY_CHIPS = [["all", "Tất cả"], ["common", "Phàm"], ["rare", "Linh"], ["epic", "Huyền"], ["legendary", "Thần"]];

// 7 slot trang bị (đồng bộ ProfilePage)
const SLOT_META = [
  { kind: "frame",    icon: "🖼️", label: "Khung Viền" },
  { kind: "pet",      icon: "🐉", label: "Linh Thú" },
  { kind: "treasure", icon: "💎", label: "Linh Bảo" },
  { kind: "dharma",   icon: "🔥", label: "Pháp Tướng" },
  { kind: "title",    icon: "🏷️", label: "Danh Hiệu" },
  { kind: "ring",     icon: "💍", label: "Nhẫn" },
  { kind: "sect",     icon: "⛩️", label: "Tông Môn" },
];
const KIND_LABEL = Object.fromEntries(SLOT_META.map((s) => [s.kind, s.label]));

const full = (u) => (u && u.startsWith("http") ? u : API_BASE_URL + u);

// 🔎 Tìm kiếm + lọc phẩm chất
function FilterBar({ query, onQuery, rarity, onRarity, counts, placeholder }) {
  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-[#f5c15c]/20 text-sm text-amber-50 placeholder-gray-500 outline-none focus:border-[#f5c15c]/60 transition"
      />
      <div className="flex gap-1.5 flex-wrap">
        {RARITY_CHIPS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onRarity(id)}
            aria-pressed={rarity === id}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${rarity === id ? "bg-[#f5c15c]/15 text-[#ffd77a] border-[#f5c15c]/50" : "text-gray-400 border-white/10 hover:border-[#f5c15c]/30"}`}
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
      className="w-full py-2 rounded-full text-xs font-bold bg-white/5 text-gray-300 hover:bg-[#f5c15c]/10 hover:text-[#ffd77a] border border-white/10 transition"
    >
      Mở thêm bảo khố ({total - shown} pháp bảo còn lại)
    </button>
  );
}

export default function CustomizationPanel({ currentUser, onBack, onSaved, onSpiritChanged, onEditInfo }) {
  const [tab, setTab] = useState("overview"); // overview | 7 kind | style
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

  // 💾 Lưu hiệu ứng tên + theme chat
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
        showToast("Đã lưu phong cách đạo hữu!");
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
        showToast(data.message || "Đã thu phục!");
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
        showToast(isEquipped ? "Đã tháo pháp bảo" : data.message || "Đã trang bị!");
        await loadData();
        onSpiritChanged?.();
      } else showToast(data.detail || "Thao tác thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // 🧪 Ướm thử
  const tryOn = (item) => {
    setTrying((t) => ({ ...t, [item.kind]: t[item.kind]?.id === item.id ? null : item }));
  };

  // ============ LỌC THEO TAB ============
  const byId = useMemo(() => new Map(catalog.map((i) => [i.id, i])), [catalog]);
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
  const previewItem = (kind) => trying[kind] || byId.get(equipped[kind]) || null;
  const preview = {
    frame: previewItem("frame"), pet: previewItem("pet"), treasure: previewItem("treasure"),
    dharma: previewItem("dharma"), title: previewItem("title"), ring: previewItem("ring"),
    sect: previewItem("sect"),
  };
  const isTrying = Object.values(trying).some(Boolean);

  const TABS = [
    { id: "overview", label: "⚔️ Tổng Quan" },
    ...SLOT_META.map((s) => ({
      id: s.kind,
      label: `${s.icon} ${s.label} (${catalog.filter((i) => i.kind === s.kind).length})`,
    })),
    { id: "style", label: "✨ Phong Cách" },
  ];

  // ⚔️ TAB TỔNG QUAN — giống trang Hồ sơ định danh: 7 slot + kho khung
  const renderOverview = () => (
    <div className="space-y-5">
      {/* 7 SLOT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SLOT_META.map((s) => {
          const item = preview[s.kind];
          return (
            <div key={s.kind} className={`x-slot-card p-3 text-center ${item ? "x-slot-on" : ""}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</div>
              {item ? (
                <>
                  <img src={full(item.image)} alt={item.name} loading="lazy" decoding="async"
                    className="w-14 h-14 mx-auto mt-2 object-contain rounded-full bg-white/5 border border-[#f5c15c]/25" />
                  <div className="text-xs font-bold text-amber-50 mt-1.5 truncate" title={item.name}>{item.name}</div>
                  <div className="text-[9px] font-bold" style={{ color: rarityOf(item.rarity).color }}>
                    {rarityOf(item.rarity).label}
                  </div>
                  <button onClick={() => toggleEquip(item)} disabled={!!busyId}
                    className="mt-1.5 w-full py-1 rounded-full text-[10px] font-bold x-btn-unequip transition disabled:opacity-50">
                    Tháo ra
                  </button>
                </>
              ) : (
                <button onClick={() => switchTab(s.kind)}
                  className="mt-2 w-full py-3 rounded-xl border border-dashed border-white/15 text-[11px] text-gray-500 hover:text-[#ffd77a] hover:border-[#f5c15c]/40 transition">
                  Chưa trang bị<br /><span className="text-[9px] opacity-70">Mở bảo khố {s.label} →</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <hr className="x-divider" />

      {/* KHO KHUNG NHANH */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          🖼️ Khung viền đang sở hữu
        </h3>
        {catalog.filter((i) => i.kind === "frame" && i.owned).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#f5c15c]/20 bg-black/20 p-6 text-center">
            <div className="text-3xl mb-2">🖼️</div>
            <p className="text-sm text-gray-400">Đạo hữu chưa sở hữu khung viền nào.</p>
            <button onClick={() => switchTab("frame")} className="mt-3 px-5 py-2 rounded-full text-xs font-bold x-btn-equip transition">
              Mở bảo khố Khung Viền ({catalog.filter((i) => i.kind === "frame").length} mẫu)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {catalog.filter((i) => i.kind === "frame" && i.owned).map((f) => {
              const isEq = equipped.frame === f.id;
              const busy = busyId === f.id;
              return (
                <div key={f.id} className={`x-item-card p-2 text-center ${isEq ? "x-equipped" : ""}`} onClick={() => toggleEquip(f)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") toggleEquip(f); }}>
                  <img src={full(f.image)} alt={f.name} loading="lazy" decoding="async"
                    className="w-16 h-16 mx-auto object-contain rounded-full bg-white/5 border border-white/10" />
                  <div className="text-[10px] font-bold text-gray-300 mt-1 truncate" title={f.name}>{f.name}</div>
                  <button disabled={busy} className={`mt-1.5 w-full py-1 rounded-full text-[10px] font-bold transition disabled:opacity-50 ${isEq ? "x-btn-unequip" : "x-btn-equip"}`}>
                    {busy ? "..." : isEq ? "Tháo" : "Đeo"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // 🗂️ TAB DANH MỤC VẬT PHẨM
  const renderItemTab = () => {
    const kindLabel = KIND_LABEL[tab] || tab;
    const ownedCount = kindItems.filter((i) => i.owned).length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Đã thu phục: <b className="text-[#ffd77a]">{ownedCount}/{kindItems.length}</b></span>
          <span className="x-chip">🪙 {xu.toLocaleString("vi-VN")} Xu</span>
        </div>
        <FilterBar
          query={query} onQuery={(v) => { setQuery(v); setLimit(24); }}
          rarity={rarity} onRarity={(r) => { setRarity(r); setLimit(24); }}
          counts={counts} placeholder={`Tầm bảo trong ${kindLabel}...`}
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
                className={`x-item-card ${rar.cls} p-3 text-center ${isEquipped ? "x-equipped" : ""} ${isTry ? "x-try" : ""}`}
                title="Chạm để ướm thử lên đạo hồ"
              >
                {isTry && !isEquipped && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-[#1a1206] bg-[#ffd77a] rounded-full px-1.5 py-0.5">🧪 ướm</span>
                )}
                <div className="relative inline-block">
                  <img
                    src={full(item.image)} alt={item.name} loading="lazy" decoding="async"
                    className="w-20 h-20 mx-auto object-contain rounded-full"
                    style={{ background: "radial-gradient(circle at 50% 38%, #1c2440, #0a0d18 72%)", border: "2px solid rgba(245,193,92,.25)" }}
                  />
                  {isEquipped && <span className="absolute -top-1 -right-1 text-[10px] bg-[#34d399] text-black font-bold rounded-full px-1.5">✓</span>}
                </div>
                <div className="mt-2 text-sm font-bold text-amber-50 truncate">{item.name}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: rar.color }}>{rar.label}</div>
                <div className="mt-2">
                  {item.owned ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleEquip(item); }}
                      disabled={busy}
                      className={`w-full py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${isEquipped ? "x-btn-unequip" : "x-btn-equip"}`}
                    >
                      {busy ? "..." : isEquipped ? "Tháo" : "Trang bị"}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); buy(item); }}
                      disabled={busy || xu < item.price_xu}
                      className="w-full py-1.5 rounded-full text-xs font-bold bg-[#f5c15c]/15 text-[#ffd77a] border border-[#f5c15c]/30 hover:bg-[#f5c15c]/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
            <div className="col-span-full text-center text-gray-500 text-sm py-8">Bảo khố trống — không tìm thấy pháp bảo phù hợp.</div>
          )}
        </div>
        <LoadMore shown={visible.length} total={filtered.length} onMore={() => setLimit((n) => n + 24)} />
        <p className="text-[11px] text-gray-500">🧪 Chạm thẻ để ướm thử lên đạo hồ trước khi thu phục • Trang bị có hiệu lực ngay toàn hệ thống.</p>
      </div>
    );
  };

  // 🌀 Portal ra body
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex overflow-y-auto p-4" onClick={onBack} role="dialog" aria-modal="true" aria-label="Bảo khố trang bị">
      <div className="x-panel w-full max-w-md md:max-w-5xl m-auto rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5c15c]/20">
          <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300"><IconBack /></button>
          <div className="flex-1">
            <h2 className="font-bold text-lg x-gold-text tracking-wide">⚔️ BẢO KHỐ TRANG BỊ</h2>
            <p className="text-[10px] text-gray-500 -mt-0.5">Pháp bảo tu tiên · 7 slot trang bị · đồng bộ Hồ sơ định danh</p>
          </div>
          <span className="x-chip">🪙 {xu.toLocaleString("vi-VN")} Xu</span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* 👤 CỘT TRÁI: đạo hồ preview (giống trang profile) */}
        <div className="shrink-0 md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-[#f5c15c]/15 p-3 md:p-4 bg-white/[0.02] md:overflow-y-auto">
          <div className="rounded-2xl border border-[#f5c15c]/20 bg-gradient-to-b from-white/[0.04] to-transparent py-5 px-6 md:px-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 x-shimmer opacity-30 pointer-events-none" />
            <AvatarFrame
              src={currentUser?.avatar_url}
              frame={preview.frame} pet={preview.pet} treasure={preview.treasure}
              dharma={preview.dharma} title={preview.title} ring={preview.ring} sect={preview.sect}
              size={96} alt=""
            />
            <div className="mt-4 text-base md:text-lg font-bold" style={{ ...cssFrom(nameEffectStyle(effect)) }}>
              {currentUser?.fullname || currentUser?.username}
            </div>
            <div className="text-xs text-gray-500">
              @{currentUser?.username}
              {Number(currentUser?.role) === 1 && <span className="text-[#ffd77a]"> · Trưởng Lão</span>}
            </div>
            {(preview.pet || preview.treasure || preview.dharma) && (
              <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                {preview.dharma && <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[11px] font-bold">🔥 {preview.dharma.name}</span>}
                {preview.pet && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">🐉 {preview.pet.name}</span>}
                {preview.treasure && <span className="px-2 py-0.5 rounded-full bg-[#f5c15c]/10 text-[#ffd77a] border border-[#f5c15c]/30 text-[11px] font-bold">💎 {preview.treasure.name}</span>}
              </div>
            )}
            {isTrying && (
              <p className="mt-1.5 text-[10px] text-[#ffd77a] font-bold">🧪 Đang ướm thử — thu phục/trang bị bằng nút trong thẻ</p>
            )}
            {onEditInfo && (
              <button onClick={onEditInfo} className="mt-2 text-[11px] text-gray-400 underline hover:text-[#ffd77a] transition">
                Sửa thông tin cơ bản (tên, SĐT, địa chỉ...)
              </button>
            )}
            <p className="mt-1.5 text-[10px] text-gray-600">
              Chạm pháp bảo để xem trước • mọi thay đổi hiện toàn hệ thống.
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 border-b border-[#f5c15c]/15 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              aria-pressed={tab === t.id}
              className={`x-tab ${tab === t.id ? "x-tab-active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {tab === "overview" && renderOverview()}
          {tab !== "overview" && tab !== "style" && renderItemTab()}

          {/* ✨ TAB PHONG CÁCH */}
          {tab === "style" && (
            <>
              <div>
                <div className="text-xs font-bold text-[#ffd77a] uppercase mb-2 tracking-wider">🔮 Bí Pháp Hiệu Ứng Tên</div>
                <div className="grid grid-cols-2 gap-2">
                  {NAME_EFFECTS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEffect(e.id)}
                      aria-pressed={effect === e.id}
                      className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition ${effect === e.id ? "border-[#f5c15c] bg-[#f5c15c]/10" : "border-white/15 hover:border-[#f5c15c]/40"}`}
                      style={cssFrom(e.css)}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#ffd77a] uppercase mb-2 tracking-wider">📜 Khung Chat Truyền Tin</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CHAT_THEMES).map(([id, t]) => (
                    <button
                      key={id}
                      onClick={() => setTheme(id)}
                      aria-pressed={theme === id}
                      className={`px-3 py-2.5 rounded-xl border-2 text-left transition ${theme === id ? "border-[#f5c15c]" : "border-white/15 hover:border-[#f5c15c]/40"}`}
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

        {/* 📌 Nút LƯU — tab phong cách */}
        {tab === "style" && (
          <div className="p-3 border-t border-[#f5c15c]/15 bg-[#0a0e17] shrink-0">
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 x-btn-equip rounded-full text-sm transition disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu Phong Cách"}
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
