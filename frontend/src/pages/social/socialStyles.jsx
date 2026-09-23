// src/pages/social/socialStyles.jsx
// 🎨 Hệ thống phong cách cá nhân hóa D4M:
//   - Khung viền avatar (GIF động)
//   - Hiệu ứng tên (nhiều kiểu)
//   - Theme khung chat (giống Messenger)
// Mọi CSS được nhúng <style> để hoạt động ngay không cần Tailwind config.

// ============================================================
// 1. HIỆU ỨNG TÊN — nhiều kiểu chọn
// ============================================================
export const NAME_EFFECTS = [
  { id: "default", label: "Mặc định", css: "color:#fff;font-weight:700;" },
  { id: "gradient", label: "Cầu vồng", css: "background:linear-gradient(90deg,#f97316,#ec4899,#8b5cf6,#3b82f6,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;" },
  { id: "neon", label: "Neon xanh", css: "color:#67e8f9;text-shadow:0 0 6px #22d3ee,0 0 12px #0891b2;font-weight:800;" },
  { id: "fire", label: "Lửa", css: "color:#fff;text-shadow:0 1px 0 #f97316,0 2px 0 #ea580c,0 3px 4px rgba(249,115,22,.6);font-weight:800;" },
  { id: "gold", label: "Hoàng kim", css: "background:linear-gradient(180deg,#fef3c7,#f59e0b,#b45309);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;text-shadow:0 0 8px rgba(245,158,11,.3);" },
  { id: "pink", label: "Kẹo ngọt", css: "background:linear-gradient(90deg,#f9a8d4,#f472b6,#db2777);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;" },
  { id: "ice", label: "Băng giá", css: "color:#bae6fd;text-shadow:0 0 8px #38bdf8,0 0 20px #0ea5e9;font-weight:700;letter-spacing:.5px;" },
  { id: "hologram", label: "Ảo ảnh", css: "background:linear-gradient(135deg,#c4b5fd,#67e8f9,#f0abfc,#a5f3fc);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800;animation:d4m-shift 3s linear infinite;background-size:300% 300%;" },
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
    border:2px solid #38bdf8; box-shadow:0 0 8px rgba(56,189,248,.5);
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
    background:#0e1626; border:1.5px solid #34d399;
    pointer-events:none; z-index:4;
  }
  /* ⛩️ Tông môn — nhỏ, góc phải trên */
  .d4m-avatar-frame-wrap > img.d4m-spirit-sect {
    position:absolute; right:-14%; top:-16%;
    object-fit:cover; border-radius:50%;
    background:#1c1026; border:1.5px solid #f472b6;
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
  /* 🎨 Thương hiệu D4M: chữ gradient + nút nhấn nổi bật */
  .d4m-brand-gradient { background: linear-gradient(90deg,#1ed760 0%,#00d2d3 50%,#5352ed 100%); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .d4m-btn-grad { background: linear-gradient(135deg,#1ed760,#00b894); color:#000 !important; box-shadow: 0 4px 16px rgba(30,215,96,.35); }
  .d4m-btn-grad:hover { filter:brightness(1.08); }
  /* 🌌 Social Hub v3: nền aurora + lưới mờ */
  .d4m-bg-aurora { position:fixed; inset:0; z-index:0; pointer-events:none;
    background:
      radial-gradient(560px 320px at 12% -4%, rgba(30,215,96,.13), transparent 62%),
      radial-gradient(640px 360px at 96% 4%, rgba(83,82,237,.14), transparent 62%),
      radial-gradient(520px 420px at 50% 108%, rgba(0,210,211,.09), transparent 64%);
    animation:d4m-aurora 16s ease-in-out infinite alternate; }
  @keyframes d4m-aurora { 0%{opacity:.8; transform:translateY(0)} 100%{opacity:1; transform:translateY(-14px)} }
  .d4m-logo-mark { background: linear-gradient(135deg,#1ed760,#00d2d3 60%,#5352ed); box-shadow:0 2px 14px rgba(30,215,96,.45); }
  .d4m-mini-card { box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
  .d4m-nav-btn { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:14px;
    font-size:14.5px; font-weight:600; color:#c7ccd6; transition:.18s; text-align:left; }
  .d4m-nav-btn:hover { background:rgba(255,255,255,.06); color:#fff; }
  .d4m-nav-active { background:linear-gradient(90deg, rgba(30,215,96,.16), rgba(0,210,211,.07)); color:#fff; box-shadow:inset 0 0 0 1px rgba(30,215,96,.25); }
  .d4m-tab-underline { background:linear-gradient(90deg,#1ed760,#00d2d3,#5352ed); box-shadow:0 0 12px rgba(30,215,96,.6); }
  @media (min-width:1024px){
    .d4m-post-card { border-radius:16px; margin:4px 8px; border:1px solid transparent; }
    .d4m-post-card:hover { background:rgba(255,255,255,.04); border-color:rgba(30,215,96,.14); }
  }
`;
