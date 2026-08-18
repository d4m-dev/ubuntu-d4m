// Bộ icon SVG inline nhỏ gọn
const S = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" };

export const HomeIcon = () => (
  <svg {...S}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const SearchIcon = () => (
  <svg {...S}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const LibraryIcon = () => (
  <svg {...S}><path d="M4 4v16M9 4v16M15 5l5 15M15.5 9l5-1.5" /></svg>
);
export const HeartIcon = ({ filled = false }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M12 20s-7-4.5-9.5-9C1 7.5 3 4.5 6 4.5c2 0 3.5 1.2 4 2.2.5-1 2.5-2.2 4-2.2 3 0 5 3 3.5 6.5C19 15.5 12 20 12 20Z" />
  </svg>
);
export const ClockIcon = () => (
  <svg {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.2l2.5 1.5" /></svg>
);
export const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11-7.2c.6-.4.6-1.3 0-1.7l-11-7.2c-.7-.4-1.6.1-1.6.8Z" /></svg>
);
export const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" /></svg>
);
export const PrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 6.5a1 1 0 0 0-2 0v11a1 1 0 0 0 2 0v-11Z" /><path d="M19 6.2c0-.8-.9-1.3-1.6-.8l-9.4 6a1 1 0 0 0 0 1.6l9.4 6c.7.5 1.6 0 1.6-.8V6.2Z" /></svg>
);
export const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.5a1 1 0 0 1 2 0v11a1 1 0 0 1-2 0v-11Z" /><path d="M5 6.2c0-.8.9-1.3 1.6-.8l9.4 6a1 1 0 0 1 0 1.6l-9.4 6c-.7.5-1.6 0-1.6-.8V6.2Z" /></svg>
);
export const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M2 7h4l10 10h6" /><path d="M22 7h-6L11.5 11" /><path d="M6 17l2-2" />
  </svg>
);
export const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H4" />
  </svg>
);
export const VolumeIcon = ({ off = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    {off ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
  </svg>
);
export const MusicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
export const LogoutIcon = () => (
  <svg {...S}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: "1em", height: "1em" }}>
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);
export const ChevronIcon = () => (
  <svg {...S}><path d="m9 18 6-6-6-6" /></svg>
);
