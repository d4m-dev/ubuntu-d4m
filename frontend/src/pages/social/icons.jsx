// src/pages/social/icons.jsx
// Bộ icon SVG mảnh giống Threads — không phụ thuộc CDN FontAwesome (fix lỗi icon/ký tự)
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" };

export const IconImage = () => (
  <svg {...base}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m4 17 5-5 3 3 3-3 5 5" /></svg>
);
export const IconBack = () => (
  <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconHome = () => (
  <svg {...base}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const IconMessage = () => (
  <svg {...base}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.7 0-3.3-.5-4.7-1.3L3 20l1.3-4.8A8.5 8.5 0 1 1 21 11.5Z" /></svg>
);
export const IconPlus = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconHeart = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"><path d="M12 20s-7-4.5-9.5-9C1 7.5 3 4.5 6 4.5c2 0 3.5 1.2 4 2.2.5-1 2.5-2.2 4-2.2 3 0 5 3 3.5 6.5C19 15.5 12 20 12 20Z" /></svg>
);
export const IconComment = () => (
  <svg {...base}><path d="M12 21a9 9 0 1 0-9-9c0 1.8.5 3.4 1.4 4.8L3 21l4.2-1.4A9 9 0 0 0 12 21Z" /></svg>
);
export const IconShare = () => (
  <svg {...base}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" /></svg>
);
export const IconTrash = () => (
  <svg {...base}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></svg>
);
export const IconRefresh = () => (
  <svg {...base}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 3v4h-4" /></svg>
);
export const IconLogout = () => (
  <svg {...base}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconPlay = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: "1em", height: "1em" }}><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
);
export const IconPause = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={{ width: "1em", height: "1em" }}><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>
);
export const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "1em", height: "1em" }}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.5-4-4 1.4-1.4 2.6 2.6 5.8-5.8 1.4 1.4-7.2 7.2Z" /></svg>
);
