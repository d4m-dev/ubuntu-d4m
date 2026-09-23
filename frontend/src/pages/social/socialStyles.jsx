// src/pages/social/socialStyles.jsx
// 🎨 Hệ thống phong cách cá nhân hóa D4M:
//   - Khung viền avatar (GIF động)
//   - Hiệu ứng tên (nhiều kiểu)
//   - Theme khung chat (giống Messenger)
// Mọi CSS được nhúng <style> để hoạt động ngay không cần Tailwind config.

// ============================================================
// 1. HIỆU ỨNG TÊN — nhiều kiểu chọn
// ============================================================
// 🎨 HIỆU ỨNG TÊN — dùng tài nguyên GIF text-masking trong backend/assets/tu-vi/more
export const NAME_EFFECTS = [
  { id: "default", label: "Mặc định", css: "color:#fff;font-weight:700;" },
  { id: "gradient", label: "Vũ Trụ", gif: "/assets/tu-vi/more/vu_tru_chi_chu_2024.gif", css: "background:linear-gradient(90deg,#f97316,#ec4899,#8b5cf6,#3b82f6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;" },
  { id: "neon", label: "Hồn Thánh", gif: "/assets/tu-vi/more/hon_thanh_v2.gif", css: "color:#67e8f9;text-shadow:0 0 6px #22d3ee,0 0 12px #0891b2;font-weight:800;" },
  { id: "fire", label: "Thần Hỏa", gif: "/assets/tu-vi/more/than_hoa.gif", css: "color:#fff;text-shadow:0 1px 0 #f97316,0 2px 0 #ea580c,0 3px 4px rgba(249,115,22,.6);font-weight:800;" },
  { id: "gold", label: "Kim Tiên", gif: "/assets/tu-vi/more/kim-tien-fix.webp", css: "background:linear-gradient(180deg,#fef3c7,#f59e0b,#b45309);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;text-shadow:0 0 8px rgba(245,158,11,.3);" },
  { id: "pink", label: "Trăng Nga", gif: "/assets/tu-vi/more/tram-nga-final.webp", css: "background:linear-gradient(90deg,#f9a8d4,#f472b6,#db2777);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;" },
  { id: "ice", label: "Thiên Thần", gif: "/assets/tu-vi/more/thien-than.gif", css: "color:#bae6fd;text-shadow:0 0 8px #38bdf8,0 0 20px #0ea5e9;font-weight:700;letter-spacing:.5px;" },
  { id: "hologram", label: "Thái Ất", gif: "/assets/tu-vi/more/thai-at.webp", css: "background:linear-gradient(135deg,#c4b5fd,#67e8f9,#f0abfc,#a5f3fc);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;animation:d4m-shift 3s linear infinite;background-size:300% 300%;" },
];

// ============================================================
// 2. THEME KHUNG CHAT — giống Messenger (bong bóng 2 chiều)
// ============================================================
export const CHAT_THEMES = {
  default: {
    label: "Messenger xanh",
    mineBg: "#0084ff",       // bong bóng của mình (xanh Messenger)
    mineColor: "#fff",
    theirsBg: "#e4e6eb",     // bong bóng người khác (xám Messenger)
    theirsColor: "#050505",
    themeBg: "#f0f2f5",      // nền chat
    bubbleRadius: "18px",
  },
  dark: {
    label: "Messenger tối",
    mineBg: "#0084ff",
    mineColor: "#fff",
    theirsBg: "#3a3b3c",
    theirsColor: "#e4e6eb",
    themeBg: "#18191a",
    bubbleRadius: "18px",
  },
  bubble: {
    label: "Bong bóng hồng",
    mineBg: "#ff5e8a",
    mineColor: "#fff",
    theirsBg: "#ffe4ec",
    theirsColor: "#9c1c44",
    themeBg: "#fff0f4",
    bubbleRadius: "22px",
  },
  mint: {
    label: "Bạc hà",
    mineBg: "#10b981",
    mineColor: "#fff",
    theirsBg: "#d1fae5",
    theirsColor: "#065f46",
    themeBg: "#ecfdf5",
    bubbleRadius: "18px",
  },
  purple: {
    label: "Tím mộng mơ",
    mineBg: "#7c3aed",
    mineColor: "#fff",
    theirsBg: "#ede9fe",
    theirsColor: "#5b21b6",
    themeBg: "#f5f3ff",
    bubbleRadius: "20px",
  },
};

// ============================================================
// CSS toàn cục cho các hiệu ứng
// ============================================================
export const SOCIAL_GLOBAL_CSS = `
  @keyframes d4m-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes d4m-pop { 0%{transform:scale(.8);opacity:0} 100%{transform:scale(1);opacity:1} }
  .d4m-avatar-frame-wrap { position:relative; display:inline-block; }
  .d4m-avatar-frame-wrap > img.d4m-avatar { border-radius:50%; object-fit:cover; }
  /* 🖼️ Khung viền v2 — bao TRỌN avatar bên ngoài, không blend */
  .d4m-avatar-frame-wrap > img.d4m-frame {
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:146%; height:146%; object-fit:contain;
    pointer-events:none; z-index:2;
  }
  /* 🔥 Pháp tướng — nổi phía TRÊN avatar (badge lớn, nền đặc) */
  .d4m-avatar-frame-wrap > img.d4m-spirit-dharma {
    position:absolute; left:50%; top:-34%; transform:translateX(-50%);
    object-fit:contain; border-radius:50%;
    background:radial-gradient(circle at 50% 35%, #2b1e4f, #120b22 75%);
    border:2px solid #a855f7; box-shadow:0 0 10px rgba(168,85,247,.55);
    pointer-events:none; z-index:4;
    animation:d4m-pet-bob 3.8s ease-in-out infinite;
  }
  /* 🐉 Linh thú — badge đặc góc phải (không trong suốt) */
  .d4m-avatar-frame-wrap > img.d4m-spirit-pet {
    position:absolute; right:-26%; bottom:-12%;
    object-fit:contain; border-radius:50%;
    background:radial-gradient(circle at 50% 35%, #14243d, #0a1220 75%);
    border:2px solid #34d399; box-shadow:0 0 8px rgba(52,211,153,.55);
    pointer-events:none; z-index:3;
    animation:d4m-pet-bob 2.6s ease-in-out infinite;
  }
  /* 💎 Linh bảo — badge đặc góc trái */
  .d4m-avatar-frame-wrap > img.d4m-spirit-treasure {
    position:absolute; left:-20%; bottom:-8%;
    object-fit:contain; border-radius:50%;
    background:radial-gradient(circle at 50% 35%, #3a2c10, #171003 75%);
    border:2px solid #fbbf24; box-shadow:0 0 8px rgba(251,191,36,.5);
    pointer-events:none; z-index:3;
    animation:d4m-pet-bob 3.4s ease-in-out infinite reverse;
  }
  /* 💍 Nhẫn — nhỏ, góc phải dưới khung */
  .d4m-avatar-frame-wrap > img.d4m-spirit-ring {
    position:absolute; right:-10%; bottom:-22%;
    object-fit:contain; border-radius:50%;
    background:#161022; border:1.5px solid #ffd77a; box-shadow:0 0 6px rgba(255,215,122,.4);
    pointer-events:none; z-index:4;
  }
  /* ⛩️ Tông môn — nhỏ, góc phải trên */
  .d4m-avatar-frame-wrap > img.d4m-spirit-sect {
    position:absolute; right:-14%; top:-16%;
    object-fit:cover; border-radius:50%;
    background:#1c0e12; border:1.5px solid #f43f5e; box-shadow:0 0 6px rgba(244,63,94,.4);
    pointer-events:none; z-index:4;
  }
  /* 🏷️ Danh hiệu — chip ảnh dưới avatar */
  .d4m-avatar-frame-wrap > img.d4m-title-chip {
    position:absolute; left:50%; top:104%; transform:translateX(-50%);
    height:14px; width:auto; object-fit:contain;
    pointer-events:none; z-index:4; filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));
  }
  @keyframes d4m-pet-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  /* dharma/ring/sect giữ nguyên transform khi bob → dùng animation riêng nhẹ hơn */
  .d4m-avatar-frame-wrap > img.d4m-spirit-dharma { animation-name:d4m-dharma-bob; }
  @keyframes d4m-dharma-bob { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,-3px)} }
  /* Chat bubbles giống Messenger */
  .d4m-chat { display:flex; width:100%; }
  .d4m-chat.mine { justify-content:flex-end; }
  .d4m-chat.theirs { justify-content:flex-start; }
  .d4m-bubble { max-width:75%; padding:8px 14px; word-wrap:break-word; white-space:pre-wrap; }
  .d4m-chat.mine .d4m-bubble { border-bottom-right-radius:4px; }
  .d4m-chat.theirs .d4m-bubble { border-bottom-left-radius:4px; }
  /* 🎨 Thương hiệu D4M — phiên bản TU TIÊN: kim quang + ngọc bích */
  .d4m-brand-gradient { background: linear-gradient(90deg,#ffd77a 0%,#f5c15c 35%,#34d399 75%,#0ea5e9 100%); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .d4m-btn-grad { background: linear-gradient(135deg,#f5c15c,#d99a2b 55%,#34d399); color:#1a1206 !important; box-shadow: 0 4px 18px rgba(245,193,92,.35); }
  .d4m-btn-grad:hover { filter:brightness(1.08); }
  /* 🌌 Social Hub v3: nền sương linh khí (aurora tu tiên) */
  .d4m-bg-aurora { position:fixed; inset:0; z-index:0; pointer-events:none;
    background:
      radial-gradient(560px 320px at 12% -4%, rgba(245,193,92,.14), transparent 62%),
      radial-gradient(640px 360px at 96% 4%, rgba(52,211,153,.12), transparent 62%),
      radial-gradient(520px 420px at 50% 108%, rgba(14,165,233,.08), transparent 64%);
    animation:d4m-aurora 16s ease-in-out infinite alternate; }
  @keyframes d4m-aurora { 0%{opacity:.8; transform:translateY(0)} 100%{opacity:1; transform:translateY(-14px)} }
  .d4m-logo-mark { background: linear-gradient(135deg,#ffd77a,#f5c15c 55%,#34d399); box-shadow:0 2px 14px rgba(245,193,92,.5); }
  .d4m-mini-card { box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
  .d4m-nav-btn { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:14px;
    font-size:14.5px; font-weight:600; color:#c7ccd6; transition:background .25s ease, color .25s ease, transform .25s ease, box-shadow .25s ease; text-align:left; }
  .d4m-nav-btn:hover { background:rgba(255,255,255,.06); color:#fff; transform:translateX(4px); }
  .d4m-nav-btn:active { transform:translateX(4px) scale(.98); }
  .d4m-nav-active { background:linear-gradient(90deg, rgba(245,193,92,.16), rgba(52,211,153,.07)); color:#ffd77a !important;
    box-shadow:inset 0 0 0 1px rgba(245,193,92,.3); transform:none; }
  /* 🧭 Menu dọc Bảo khố (desktop) */
  .x-side-tab { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px;
    font-size:13px; font-weight:600; color:#c7ccd6; text-align:left; border:1px solid transparent;
    transition:background .22s ease, color .22s ease, transform .22s ease, border-color .22s ease; }
  .x-side-tab:hover { background:rgba(255,255,255,.06); color:#fff; transform:translateX(3px); }
  .x-side-tab-active { background:linear-gradient(90deg, rgba(245,193,92,.16), rgba(52,211,153,.06));
    color:#ffd77a; border-color:rgba(245,193,92,.35); transform:none; }
  .d4m-tab-underline { background:linear-gradient(90deg,#ffd77a,#f5c15c,#34d399); box-shadow:0 0 12px rgba(245,193,92,.6); }
  @media (min-width:1024px){
    .d4m-post-card { border-radius:16px; margin:4px 8px; border:1px solid transparent; }
    .d4m-post-card:hover { background:rgba(255,255,255,.04); border-color:rgba(245,193,92,.16); }
  }

  /* ═══════════════════════════════════════════════════════════
     ⚔️ TUYẾN THEME TU TIÊN — BẢO KHỐ TRANG BỊ (dùng chung
     cho CustomizationPanel + Hồ sơ định danh)
     ═══════════════════════════════════════════════════════════ */
  .x-panel { position:relative; background:linear-gradient(160deg, rgba(17,24,39,.92), rgba(10,14,23,.96));
    border:1px solid rgba(245,193,92,.22); box-shadow:0 10px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04); }
  /* 4 góc hoa văn cổ */
  .x-panel::before, .x-panel::after { content:""; position:absolute; width:18px; height:18px; pointer-events:none;
    border-color:rgba(245,193,92,.75); border-style:solid; }
  .x-panel::before { top:-1px; left:-1px; border-width:2px 0 0 2px; border-top-left-radius:10px; }
  .x-panel::after  { bottom:-1px; right:-1px; border-width:0 2px 2px 0; border-bottom-right-radius:10px; }
  .x-gold-text { background:linear-gradient(90deg,#ffe9a8,#f5c15c 45%,#d99a2b); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .x-divider { height:1px; background:linear-gradient(90deg, transparent, rgba(245,193,92,.5), transparent); border:none; }
  .x-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 10px; border-radius:999px;
    font-size:11px; font-weight:700; border:1px solid rgba(245,193,92,.35); color:#ffd77a; background:rgba(245,193,92,.08); }
  .x-slot-card { position:relative; border-radius:16px; border:1px solid rgba(255,255,255,.09);
    background:radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,.05), rgba(0,0,0,.25)); transition:.2s; }
  .x-slot-card.x-slot-on { border-color:rgba(245,193,92,.55); box-shadow:0 0 18px rgba(245,193,92,.15), inset 0 0 24px rgba(245,193,92,.05); }
  .x-item-card { position:relative; border-radius:16px; border:2px solid rgba(255,255,255,.1); cursor:pointer;
    background:radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.045), rgba(8,11,18,.9)); transition:.18s; }
  .x-item-card:hover { transform:translateY(-2px); background:radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.08), rgba(8,11,18,.9)); }
  .x-item-card.x-equipped { border-color:#34d399 !important; box-shadow:0 0 16px rgba(52,211,153,.25); }
  .x-item-card.x-try { border-color:#ffd77a !important; box-shadow:0 0 16px rgba(245,193,92,.3); }
  .x-rarity-common    { border-color:#6b7280; }
  .x-rarity-rare      { border-color:#38bdf8; box-shadow:0 0 10px rgba(56,189,248,.12); }
  .x-rarity-epic      { border-color:#c084fc; box-shadow:0 0 10px rgba(192,132,252,.14); }
  .x-rarity-legendary { border-color:#f5c15c; box-shadow:0 0 14px rgba(245,193,92,.22); }
  .x-btn-equip { background:linear-gradient(135deg,#f5c15c,#d99a2b); color:#1a1206; font-weight:800; }
  .x-btn-equip:hover { filter:brightness(1.1); }
  .x-btn-unequip { background:rgba(255,255,255,.08); color:#d1d5db; }
  .x-btn-unequip:hover { background:rgba(244,63,94,.18); color:#fda4af; }
  .x-tab { position:relative; padding:10px 14px; font-size:12.5px; font-weight:700; white-space:nowrap;
    color:#9ca3af; border-radius:12px 12px 0 0; transition:.15s; }
  .x-tab:hover { color:#e5e7eb; }
  .x-tab-active { color:#ffd77a; background:linear-gradient(180deg, rgba(245,193,92,.12), transparent);
    box-shadow:inset 0 -2px 0 #f5c15c; }
  @keyframes x-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .x-shimmer { background:linear-gradient(110deg, transparent 30%, rgba(255,255,255,.14) 50%, transparent 70%);
    background-size:200% 100%; animation:x-shimmer 2.6s linear infinite; }

  /* ═══ 🧘 PHÀM NHÂN TU TIÊN — text masking tên đạo hữu theo cảnh giới ═══ */
  .dao-huu-name {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important; -webkit-background-clip: text !important;
    display:inline-block; padding:0.1rem 0.35rem; font-weight:bold;
    background-size:cover; background-position:center; background-repeat:no-repeat;
    background-color: var(--tier-fallback-color, #D1D5DB);
    background-image: var(--tier-gif), var(--tier-gradient);
    filter: var(--tier-glow, none);
    transition: filter .5s ease, background-image .5s ease;
  }
  /* Chip divider ngày trong chat */
  .d4m-day-chip { font-size:10px; font-weight:700; color:#9ca3af; background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.08); padding:3px 10px; border-radius:999px; }
  /* Nút đả tọa — hơi thở linh khí */
  @keyframes x-breathe { 0%,100%{box-shadow:0 0 8px rgba(52,211,153,.25)} 50%{box-shadow:0 0 22px rgba(52,211,153,.55)} }
  .x-meditate { animation:x-breathe 3s ease-in-out infinite; }

  /* ═══ 📱 ĐIỀU HƯỚNG KIỂU APP ═══
     Mobile: màn hình con phủ kín (fixed) NHƯNG chừa chỗ navbar đáy cố định.
     Desktop: render INLINE trong cột nội dung (chuyển tab, không full-screen). */
  .d4m-view { position:fixed; inset:0; z-index:60; background:#06080d;
    padding-bottom:72px; display:flex; flex-direction:column; }
  .d4m-view-card { flex:1; min-height:0; display:flex; flex-direction:column; }
  @media (min-width:1024px){
    .d4m-view { position:sticky; top:0; inset:auto; z-index:auto; background:transparent;
      padding-bottom:0; height:100vh; }
    .d4m-view-card { border:1px solid rgba(245,193,92,.16); border-radius:20px;
      background:rgba(10,14,23,.72); overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,.4); }
  }
`;
