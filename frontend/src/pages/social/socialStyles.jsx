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
  .d4m-avatar-frame-wrap > img.d4m-frame {
    position:absolute; inset:0; width:100%; height:100%; border-radius:50%;
    object-fit:contain; pointer-events:none; mix-blend-mode:screen;
  }
  /* 🐉 Linh thú — art nền đen kiểu game: blend-screen xóa nền đen,
     nổi như hào quang quanh avatar (góc phải dưới) */
  .d4m-avatar-frame-wrap > img.d4m-spirit-pet {
    position:absolute; right:-32%; bottom:-14%;
    width:88% !important; height:88% !important;
    object-fit:contain; mix-blend-mode:screen;
    filter:drop-shadow(0 0 6px rgba(120,200,255,.45));
    pointer-events:none; z-index:3;
    animation:d4m-pet-bob 2.6s ease-in-out infinite;
  }
  /* 💎 Linh bảo — góc trái dưới */
  .d4m-avatar-frame-wrap > img.d4m-spirit-treasure {
    position:absolute; left:-28%; bottom:-10%;
    width:74% !important; height:74% !important;
    object-fit:contain; mix-blend-mode:screen;
    filter:drop-shadow(0 0 5px rgba(255,200,80,.5));
    pointer-events:none; z-index:3;
    animation:d4m-pet-bob 3.4s ease-in-out infinite reverse;
  }
  @keyframes d4m-pet-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
  /* Chat bubbles giống Messenger */
  .d4m-chat { display:flex; width:100%; }
  .d4m-chat.mine { justify-content:flex-end; }
  .d4m-chat.theirs { justify-content:flex-start; }
  .d4m-bubble { max-width:75%; padding:8px 14px; word-wrap:break-word; white-space:pre-wrap; }
  .d4m-chat.mine .d4m-bubble { border-bottom-right-radius:4px; }
  .d4m-chat.theirs .d4m-bubble { border-bottom-left-radius:4px; }
`;
