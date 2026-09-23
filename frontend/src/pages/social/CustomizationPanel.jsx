// src/pages/social/CustomizationPanel.jsx
// ⚔️ BẢO KHỐ TRANG BỊ v3 — phong cách TU TIÊN / KIẾM HIỆP
// Layout đồng nhất với trang Hồ sơ định danh (/admin/profile):
//   • Cột trái: đạo hồ preview (avatar 7 slot + tên + chip trang bị)
//   • Cột phải: Tổng quan 7 slot + tabs danh mục + Phong cách
import { useEffect, useMemo, useState } from "react";
import { SOCIAL, API_BASE_URL } from "../../config/urls";
import { getToken } from "../../services/api";
import { showToast } from "../../lib/toast";
import { IconBack } from "./icons";
import { NAME_EFFECTS, CHAT_THEMES } from "./socialStyles";
import { nameEffectStyle } from "./AvatarFrame";
import AvatarFrame from "./AvatarFrame";
import RealmName from "./RealmName";

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
  // 🧘 HỆ THỐNG TU TIÊN (cảnh giới · đả tọa · đột phá · linh căn · đan dược)
  const [cult, setCult] = useState(null); // {realms, roots, user}
  const [cultBusy, setCultBusy] = useState(false);
  // 🪙 HỆ THỐNG XU (nhiệm vụ · mua PayOS · tặng)
  const [xuData, setXuData] = useState({ tasks: [], packages: [], history: [], payosReady: false });
  const [pendingOrder, setPendingOrder] = useState(null); // {order_code, xu}
  const [giftForm, setGiftForm] = useState({ to: "", amount: "", note: "" });
  const [giftBusy, setGiftBusy] = useState(false);

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

  // 🧘 Tải trạng thái tu tiên
  const loadCult = async () => {
    try {
      const res = await fetch(SOCIAL.CULT_STATE, { headers: authHeaders() });
      const d = await res.json();
      if (d.status === "success") setCult(d.data);
    } catch (e) { /* im lặng */ }
  };

  const cultAction = async (url, body, onSuccess) => {
    if (cultBusy) return;
    setCultBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify(body || {}) });
      const d = await res.json();
      if (d.status === "success") {
        showToast(d.message || "Thành công!");
        await loadCult();
        onSuccess?.(d);
      } else showToast(d.detail || "Thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setCultBusy(false); }
  };

  useEffect(() => { loadData(); loadXu(); loadCult(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // 🪙 Tải nhiệm vụ + gói nạp + lịch sử Xu
  const loadXu = async () => {
    try {
      const [tRes, pRes, hRes] = await Promise.all([
        fetch(SOCIAL.XU_TASKS, { headers: authHeaders() }),
        fetch(SOCIAL.XU_PACKAGES, { headers: authHeaders() }),
        fetch(SOCIAL.XU_HISTORY, { headers: authHeaders() }),
      ]);
      const t = await tRes.json();
      const p = await pRes.json();
      const h = await hRes.json();
      setXuData({
        tasks: t.data?.tasks || [],
        packages: p.data || [],
        payosReady: !!p.payos_ready,
        history: h.data?.history || [],
      });
      if (typeof t.data?.xu === "number") setXu(t.data.xu);
    } catch (e) { /* im lặng */ }
  };

  // ✅ Nhận thưởng nhiệm vụ
  const claimTask = async (task) => {
    if (busyId) return;
    setBusyId(task.key);
    try {
      const res = await fetch(SOCIAL.XU_CLAIM, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ task_key: task.key }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(data.message || "Đã nhận thưởng!");
        if (typeof data.xu === "number") setXu(data.xu);
        await loadXu();
      } else showToast(data.detail || "Không nhận được thưởng", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // 💳 Mua Xu qua PayOS
  const startBuy = async (pkg) => {
    if (busyId) return;
    setBusyId(pkg.id);
    try {
      const res = await fetch(SOCIAL.XU_BUY, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ package_id: pkg.id }),
      });
      const data = await res.json();
      if (data.status === "success" && data.checkout_url) {
        window.open(data.checkout_url, "_blank", "noopener");
        setPendingOrder({ order_code: data.order_code, xu: data.xu });
        showToast("Đã mở cổng thanh toán — hoàn tất rồi quay lại đây nhé!");
      } else showToast(data.detail || "Không tạo được đơn thanh toán", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setBusyId(null); }
  };

  // 🔁 Polling kết quả thanh toán PayOS
  useEffect(() => {
    if (!pendingOrder) return;
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        const res = await fetch(SOCIAL.XU_BUY_STATUS(pendingOrder.order_code), { headers: authHeaders() });
        const data = await res.json();
        if (data.paid) {
          clearInterval(id);
          setPendingOrder(null);
          if (typeof data.xu === "number") setXu(data.xu);
          showToast(`🎉 Nạp thành công +${pendingOrder.xu.toLocaleString("vi-VN")} Xu!`);
          await loadXu();
        } else if (data.cancelled) {
          clearInterval(id);
          setPendingOrder(null);
          showToast("Đơn nạp đã hủy.", "error");
        } else if (tries >= 150) { // ~10 phút
          clearInterval(id);
          setPendingOrder(null);
        }
      } catch (e) { /* bỏ qua nhịp lỗi */ }
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrder]);

  // 🎁 Tặng Xu
  const sendGift = async () => {
    if (giftBusy) return;
    const amount = Number(giftForm.amount);
    if (!giftForm.to.trim()) return showToast("Nhập tên đạo hữu cần tặng!", "error");
    if (!amount || amount < 1000) return showToast("Tối thiểu 1.000 Xu!", "error");
    setGiftBusy(true);
    try {
      const res = await fetch(SOCIAL.XU_GIFT, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ to_username: giftForm.to.trim(), amount, note: giftForm.note }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showToast(data.message || "Đã tặng Xu!");
        if (typeof data.xu === "number") setXu(data.xu);
        setGiftForm({ to: "", amount: "", note: "" });
        await loadXu();
      } else showToast(data.detail || "Tặng thất bại", "error");
    } catch (e) { showToast("Lỗi mạng", "error"); }
    finally { setGiftBusy(false); }
  };

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

  // 🧘 TAB CẢNH GIỚI — hệ thống tu tiên đầy đủ
  const renderCultTab = () => {
    if (!cult) return <div className="text-gray-500 text-sm">Đang mở thiên cơ các...</div>;
    const abs = (v) => !v ? "" : v.startsWith("./") ? API_BASE_URL + "/assets/tu-vi/" + v.slice(2)
      : v.startsWith("/") ? API_BASE_URL + v : v;
    const u = cult.user || {};
    const cur = { ...u.realm }; cur.bg_gif = abs(cur.bg_gif); cur.font_file = abs(cur.font_file);
    const nxt = u.next || null;
    const pct = Math.round((u.progress || 0) * 100);
    const pills = catalog.filter((i) => i.category === "luyen-dan" && i.owned);
    return (
      <div className="space-y-5">
        {/* CẢNH GIỚI HIỆN TẠI */}
        <div className="x-slot-card x-slot-on relative overflow-hidden p-5 text-center">
          {cur.bg_gif && (
            <img src={cur.bg_gif} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />
          )}
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-gray-400">{cur.major_realm}</div>
            <RealmName realmIndex={u.realm_index} name={cur.display_title || "Phàm Nhân"}
              className="text-2xl md:text-3xl mt-1" />
            <div className="mt-1 text-[11px] text-gray-500">Thọ mệnh {cur.lifespan_years} năm · Tu vi {Number(u.cultivation || 0).toLocaleString("vi-VN")}</div>
            {nxt ? (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Tiến tới «{nxt.display_title}»</span>
                  <span>{Number(u.cultivation || 0).toLocaleString("vi-VN")} / {nxt.required_exp.toLocaleString("vi-VN")}</span>
                </div>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#34d399,#f5c15c)" }} />
                </div>
                {nxt.tribulation?.has_tribulation && (
                  <div className="mt-2 text-[10px] text-rose-300 font-bold">⚡ Thiên kiếp chờ đợi: {nxt.tribulation.name}</div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-[#ffd77a] font-bold"> Đã đạt đỉnh phong Đạo Tổ!</div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => cultAction(SOCIAL.CULT_MEDITATE, {})} disabled={cultBusy}
                className="x-meditate py-2.5 rounded-full text-sm font-bold x-btn-equip transition disabled:opacity-50">
                🧘 Đả Tọa (+{u.meditate_exp || 200})
              </button>
              <button onClick={() => cultAction(SOCIAL.CULT_BREAK, {})} disabled={cultBusy || pct < 100}
                className="py-2.5 rounded-full text-sm font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed">
                ⚡ Đột Phá
              </button>
            </div>
          </div>
        </div>

        {/* LINH CĂN */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffd77a] mb-2">🌱 Linh Căn Ngũ Hành {u.spirit_root ? "(đã định hình)" : "(chọn 1 lần — +10% tu vi)"}</h3>
          <div className="grid grid-cols-5 gap-2">
            {(cult.roots || []).map((r) => (
              <button key={r.id}
                onClick={() => !u.spirit_root && cultAction(SOCIAL.CULT_ROOT, { root: r.id })}
                disabled={!!u.spirit_root && u.spirit_root !== r.id}
                className={`x-slot-card p-2.5 text-center transition ${u.spirit_root === r.id ? "x-slot-on" : ""} ${u.spirit_root && u.spirit_root !== r.id ? "opacity-35" : "hover:brightness-125"}`}
                title={r.label}>
                <img src={API_BASE_URL + r.image} alt={r.label} className="w-10 h-10 mx-auto object-contain" loading="lazy" />
                <div className="text-[10px] font-bold text-gray-300 mt-1">{r.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ĐAN DƯỢC */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffd77a] mb-2">💊 Đan Dược Trong Túi ({pills.length})</h3>
          {pills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#f5c15c]/20 bg-black/20 p-4 text-center text-xs text-gray-500">
              Chưa có đan dược — mua ở tab «Luyện đan» hoặc nhiệm vụ...
              <button onClick={() => switchTab("overview")} className="block mx-auto mt-2 text-[#ffd77a] font-bold underline">Mở bảo khố</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {pills.map((p) => (
                <div key={p.id} className="x-item-card p-2 text-center">
                  <img src={full(p.image)} alt={p.name} className="w-12 h-12 mx-auto object-contain" loading="lazy" />
                  <div className="text-[9px] font-bold text-gray-300 mt-1 truncate" title={p.name}>{p.name}</div>
                  <button onClick={() => cultAction(SOCIAL.CULT_PILL, { item_id: p.id })} disabled={cultBusy}
                    className="mt-1 w-full py-1 rounded-full text-[10px] font-bold x-btn-equip disabled:opacity-50">
                    Luyện hóa +{Number(p.pill_exp || 500).toLocaleString("vi-VN")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ĐAN PHÒNG — mua thêm */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">🏮 Đan Phòng (mua bằng Xu)</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {catalog.filter((i) => i.category === "luyen-dan" && !i.owned).slice(0, 10).map((p) => (
              <div key={p.id} className="x-item-card p-2 text-center">
                <img src={full(p.image)} alt={p.name} className="w-12 h-12 mx-auto object-contain" loading="lazy" />
                <div className="text-[9px] font-bold text-gray-300 mt-1 truncate" title={p.name}>{p.name}</div>
                <button onClick={() => buy(p)} disabled={!!busyId || xu < p.price_xu}
                  className="mt-1 w-full py-1 rounded-full text-[10px] font-bold bg-[#f5c15c]/15 text-[#ffd77a] border border-[#f5c15c]/30 hover:bg-[#f5c15c]/25 disabled:opacity-40 transition">
                  🪙 {Number(p.price_xu || 0).toLocaleString("vi-VN")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* LỘ TRÌNH 50 CẢNH GIỚI */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">🗺️ Lộ Trình Tu Tiên ({(cult.realms || []).length} cảnh giới)</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(cult.realms || []).map((r) => {
              const state = r.index === u.realm_index ? "cur" : r.index < u.realm_index ? "done" : "lock";
              return (
                <div key={r.id} className={`shrink-0 w-24 rounded-xl border p-2 text-center ${state === "cur" ? "border-[#f5c15c] bg-[#f5c15c]/10" : state === "done" ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-black/20 opacity-60"}`}>
                  <div className="text-[9px] text-gray-500">{r.index}</div>
                  <div className={`text-[10px] font-bold truncate ${state === "cur" ? "text-[#ffd77a]" : state === "done" ? "text-emerald-300" : "text-gray-400"}`} title={r.display_title}>
                    {state === "lock" ? "🔒 " : state === "cur" ? "☯ " : "✓ "}{r.tier_name}
                  </div>
                  <div className="text-[8px] text-gray-600">{r.sub_stage}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const TABS = [
    { id: "overview", label: "⚔️ Tổng Quan" },
    { id: "xu", label: "🪙 Kiếm & Nạp Xu" },
    { id: "cult", label: "🧘 Cảnh Giới" },
    ...SLOT_META.map((s) => ({ id: s.kind, label: `${s.icon} ${s.label}` })),
    { id: "style", label: "✨ Phong Cách" },
  ];

  // 🪙 TAB XU — nhiệm vụ · mua (PayOS) · tặng · lịch sử
  const renderXuTab = () => (
    <div className="space-y-6">
      {/* NHIỆM VỤ */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffd77a] mb-3">📜 Nhiệm Vụ Hằng Ngày</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {xuData.tasks.map((t) => (
            <div key={t.key} className={`x-slot-card p-4 shrink-0 w-[240px] md:w-[260px] ${t.done ? "x-slot-on" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{t.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-amber-50">{t.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{t.desc}</div>
                  <div className="text-[11px] font-bold text-[#ffd77a] mt-1">🪙 +{t.reward.toLocaleString("vi-VN")} Xu</div>
                </div>
              </div>
              <button
                onClick={() => claimTask(t)}
                disabled={t.done || (!t.completed && t.key !== "checkin") || !!busyId}
                className={`mt-3 w-full py-2 rounded-full text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${t.done ? "x-btn-unequip" : "x-btn-equip"}`}
                title={!t.done && !t.completed && t.key !== "checkin" ? "Chưa đủ điều kiện" : ""}
              >
                {busyId === t.key ? "..." : t.done ? "✓ Đã nhận hôm nay" : (!t.completed && t.key !== "checkin") ? "Chưa hoàn thành" : "Nhận thưởng"}
              </button>
            </div>
          ))}
          {xuData.tasks.length === 0 && <div className="text-gray-500 text-sm col-span-full">Chưa tải được nhiệm vụ...</div>}
        </div>
      </div>

      <hr className="x-divider" />

      {/* MUA XU */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffd77a]">💳 Mua Xu (thanh toán PayOS)</h3>
          {!xuData.payosReady && <span className="text-[10px] text-rose-400 font-bold">⚠️ PayOS chưa cấu hình</span>}
        </div>
        {pendingOrder && (
          <div className="mb-3 rounded-xl border border-[#f5c15c]/40 bg-[#f5c15c]/10 px-4 py-2.5 text-xs text-[#ffd77a] font-bold">
            ⏳ Đang chờ xác nhận thanh toán +{pendingOrder.xu.toLocaleString("vi-VN")} Xu... (tự kiểm tra mỗi 4 giây)
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {xuData.packages.map((p) => (
            <div key={p.id} className="x-slot-card p-4 text-center">
              <div className="text-3xl">{p.icon}</div>
              <div className="text-sm font-bold text-amber-50 mt-1">{p.name}</div>
              <div className="text-lg font-black x-gold-text mt-1">🪙 {p.xu.toLocaleString("vi-VN")}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">= {p.vnd.toLocaleString("vi-VN")}đ</div>
              <button
                onClick={() => startBuy(p)}
                disabled={!!busyId || !xuData.payosReady || !!pendingOrder}
                className="mt-3 w-full py-2 rounded-full text-xs font-bold x-btn-equip transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busyId === p.id ? "Đang tạo đơn..." : "Mua ngay"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <hr className="x-divider" />

      {/* TẶNG XU */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#ffd77a] mb-3">🎁 Tặng Xu Cho Đạo Hữu</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={giftForm.to}
            onChange={(e) => setGiftForm({ ...giftForm, to: e.target.value })}
            placeholder="Tên người nhận (username)"
            className="px-3 py-2.5 rounded-xl bg-black/40 border border-[#f5c15c]/20 text-sm text-amber-50 placeholder-gray-500 outline-none focus:border-[#f5c15c]/60 transition"
          />
          <input
            value={giftForm.amount}
            onChange={(e) => setGiftForm({ ...giftForm, amount: e.target.value.replace(/[^0-9]/g, "") })}
            placeholder="Số Xu (≥ 1.000)"
            inputMode="numeric"
            className="px-3 py-2.5 rounded-xl bg-black/40 border border-[#f5c15c]/20 text-sm text-amber-50 placeholder-gray-500 outline-none focus:border-[#f5c15c]/60 transition"
          />
          <input
            value={giftForm.note}
            onChange={(e) => setGiftForm({ ...giftForm, note: e.target.value })}
            placeholder="Lời nhắn (không bắt buộc)"
            className="px-3 py-2.5 rounded-xl bg-black/40 border border-[#f5c15c]/20 text-sm text-amber-50 placeholder-gray-500 outline-none focus:border-[#f5c15c]/60 transition"
          />
          <button
            onClick={sendGift}
            disabled={giftBusy}
            className="py-2.5 rounded-xl text-sm font-bold x-btn-equip transition disabled:opacity-50"
          >
            {giftBusy ? "Đang tặng..." : "🎁 Tặng Xu"}
          </button>
        </div>
      </div>

      {/* LỊCH SỬ */}
      {xuData.history.length > 0 && (
        <>
          <hr className="x-divider" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">📒 Sổ Giao Dịch Gần Nhất</h3>
            <div className="space-y-1">
              {xuData.history.slice(0, 10).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.03]">
                  <span className="text-gray-400 truncate mr-2">{h.note || h.kind}</span>
                  <span className={`font-bold shrink-0 ${h.xu >= 0 ? "text-[#ffd77a]" : "text-rose-400"}`}>
                    {h.xu >= 0 ? "+" : ""}{h.xu.toLocaleString("vi-VN")} Xu
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ⚔️ TAB TỔNG QUAN — giống trang Hồ sơ định danh: 7 slot + kho khung
  const renderOverview = () => (
    <div className="space-y-5">
      {/* 7 SLOT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {SLOT_META.map((s) => {
          const item = preview[s.kind];
          return (
            <div key={s.kind} className={`x-slot-card p-3 text-center ${item ? "x-slot-on" : ""}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.label}</div>
              {item ? (
                <>
                  <img src={full(item.image)} alt={item.name} loading="lazy" decoding="async"
                    className="w-10 h-10 md:w-14 md:h-14 mx-auto mt-1 md:mt-2 object-contain rounded-full bg-white/5 border border-[#f5c15c]/25" />
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
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
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
                    className="w-14 h-14 md:w-20 md:h-20 mx-auto object-contain rounded-full"
                    style={{ background: "radial-gradient(circle at 50% 38%, #1c2440, #0a0d18 72%)", border: "2px solid rgba(245,193,92,.25)" }}
                  />
                  {isEquipped && <span className="absolute -top-1 -right-1 text-[10px] bg-[#34d399] text-black font-bold rounded-full px-1.5">✓</span>}
                </div>
                <div className="mt-1 md:mt-2 text-[11px] md:text-sm font-bold text-amber-50 truncate">{item.name}</div>
                <div className="text-[9px] md:text-[10px] font-bold mt-0.5" style={{ color: rar.color }}>{rar.label}</div>
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
  return (
    <div className="d4m-view" role="dialog" aria-label="Bảo khố trang bị">
      <div className="d4m-view-card x-panel w-full rounded-none lg:rounded-3xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f5c15c]/20">
          <button onClick={onBack} aria-label="Quay lại" className="p-1.5 -ml-2 rounded-full hover:bg-white/10 text-gray-300"><IconBack /></button>
          <div className="flex-1">
            <h2 className="font-bold text-lg x-gold-text tracking-wide">⚔️ BẢO KHỐ TRANG BỊ</h2>
            <p className="text-[10px] text-gray-500 -mt-0.5">Pháp bảo tu tiên · 7 slot trang bị · đồng bộ Hồ sơ định danh</p>
          </div>
          <button onClick={() => switchTab("xu")} className="x-chip hover:brightness-125 transition" title="Kiếm & nạp Xu">🪙 {xu.toLocaleString("vi-VN")} Xu</button>
        </div>

        {/* Tabs ngang — CHỈ mobile (desktop dùng menu dọc bên trái) */}
        <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-[#f5c15c]/15 overflow-x-auto md:hidden">
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

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* 👤 CỘT TRÁI: preview + menu dọc (desktop) */}
        <div className="shrink-0 md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#f5c15c]/15 p-3 md:p-4 bg-white/[0.02] md:overflow-y-auto">
          <div className="rounded-2xl border border-[#f5c15c]/20 bg-gradient-to-b from-white/[0.04] to-transparent py-5 px-6 md:px-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 x-shimmer opacity-30 pointer-events-none" />
            <AvatarFrame
              src={currentUser?.avatar_url}
              frame={preview.frame} pet={preview.pet} treasure={preview.treasure}
              dharma={preview.dharma} title={preview.title} ring={preview.ring} sect={preview.sect}
              size={96} alt=""
            />
            <div className="mt-4 text-base md:text-lg">
              <RealmName realmIndex={currentUser?.realm_index || 0} spiritRoot={currentUser?.spirit_root}
                effectId={effect} name={currentUser?.fullname || currentUser?.username} className="font-black" />
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

          {/* 🧭 MENU DỌC (desktop) — luôn hiện dưới preview, bấm để mở mục bên phải */}
          <nav className="hidden md:flex flex-col gap-1 mt-3" aria-label="Danh mục bảo khố">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                aria-pressed={tab === t.id}
                className={`x-side-tab ${tab === t.id ? "x-side-tab-active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {tab === "overview" && renderOverview()}
          {tab === "xu" && renderXuTab()}
          {tab === "cult" && renderCultTab()}
          {tab !== "overview" && tab !== "xu" && tab !== "style" && renderItemTab()}

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
                    >
                      <RealmName effectId={e.id} name={e.label} className="text-sm" />
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
      const camel = k.replace(/-([a-z])/, (_, c) => c.toUpperCase());
      if (k === "-webkit-background-clip") obj.WebkitBackgroundClip = v;
      else if (k === "background-clip") obj.backgroundClip = v;
      else obj[camel] = v;
    }
  });
  return obj;
}
