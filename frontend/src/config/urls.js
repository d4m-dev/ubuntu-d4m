/**
 * ============================================================
 * 🎯 D4M MUSIC PRO — BẢNG URL TẬP TRUNG
 * ============================================================
 * ĐÂY LÀ FILE DUY NHẤT CHỨA MỌI ĐƯỜNG DẪN (URL) của toàn bộ dự án.
 * Muốn đổi đường dẫn API / hình / tài nguyên → CHỈ CẦN SỬA Ở ĐÂY,
 * không cần lục lọi code.
 *
 * 2 biến chính:
 *   - API_BASE_URL : điểm gốc backend (từ .env VITE_API_BASE_URL)
 *   - WS_BASE_URL  : điểm gốc WebSocket (từ .env VITE_WS_BASE_URL)
 * ============================================================
 */

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || "";
const rawWsUrl =
  import.meta.env.VITE_WS_BASE_URL ||
  // Để trống .env → WS tự suy từ host hiện tại (wss:// theo https, ws:// theo http)
  // để chạy được cả qua proxy (vite dev / nginx docker) lẫn gọi thẳng backend.
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
    : "");

export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");
export const WS_BASE_URL = rawWsUrl.replace(/\/+$/, "");

// ============================================================
// 🖼️ URL TÀI NGUYÊN TĨNH & NỘI BỘ
// ============================================================
export const STATIC = {
  DEFAULT_AVATAR: "/src/assets/favicon/favicon-96x96.png",
  FALLBACK_COVER: "/assets/favicon/favicon-96x96.png",
  // Hàm tạo avatar ngẫu nhiên (DiceBear)
  avatar: (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`,
};

// ============================================================
// 🎵 D4M MUSIC (api/dmusic/*) — MODULE NGHE NHẠC
// ============================================================
export const DMUSIC = {
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/dmusic/auth/register`,
    LOGIN: `${API_BASE_URL}/api/dmusic/auth/login`,
    GUEST: `${API_BASE_URL}/api/dmusic/auth/guest`,
  },
  // Music
  MUSIC: {
    HOME: `${API_BASE_URL}/api/dmusic/music/home`,
    SEARCH: (q) => `${API_BASE_URL}/api/dmusic/music/search?q=${encodeURIComponent(q || "")}`,
    PLAYLIST: (id) => `${API_BASE_URL}/api/dmusic/music/playlist/${id}`,
  },
  // Library
  LIBRARY: {
    LIKED: `${API_BASE_URL}/api/dmusic/library/liked`,
    HISTORY: `${API_BASE_URL}/api/dmusic/library/history`,
    MY_PLAYLISTS: `${API_BASE_URL}/api/dmusic/library/my-playlists`,
    INTERACT: `${API_BASE_URL}/api/dmusic/library/interact`,
    TOGGLE_LIKE: `${API_BASE_URL}/api/dmusic/library/toggle-like`,
  },
};

// ============================================================
// 📡 AUDIO ENGINE (stream/cover/lyrics) — API /api/audio/*
// ============================================================
export const AUDIO = {
  HOME: `${API_BASE_URL}/api/audio/music/home`,
  INTERACT: `${API_BASE_URL}/api/audio/music/interact`,
  STREAM: (project, file) => `${API_BASE_URL}/api/audio/stream/${project}/${file}`,
  COVER: (project, file) => `${API_BASE_URL}/api/audio/cover/${project}/${file}`,
  LYRICS: (project, file) => `${API_BASE_URL}/api/audio/lyrics/${project}/${file}`,
  EXTRACT: `${API_BASE_URL}/api/audio/extract`,
  STATUS: (folder) => `${API_BASE_URL}/api/audio/status/${folder}`,
};

// ============================================================
// 🎵 MUSIC HUB (api/music/*) — module cũ hệ sinh thái
// ============================================================
export const MUSIC_HUB = {
  STREAM: (folder, filename) => `${API_BASE_URL}/api/music/stream/${folder}/${filename}`,
  COVER: (folder) => `${API_BASE_URL}/api/music/cover/${folder}`,
  LYRICS: (folder) => `${API_BASE_URL}/api/music/lyrics/${folder}`,
  LIST: `${API_BASE_URL}/api/music/list`,
};

// ============================================================
// 🔐 AUTH / SSO — API /api/auth/*
// ============================================================
export const AUTH = {
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  ADMIN_USERS: `${API_BASE_URL}/api/auth/admin/users`,
  ADMIN_TOGGLE_ACTIVE: (id) => `${API_BASE_URL}/api/auth/admin/users/${id}/toggle-active`,
  ADMIN_CHANGE_ROLE: (id) => `${API_BASE_URL}/api/auth/admin/users/${id}/change-role`,
  ADMIN_DELETE: (id) => `${API_BASE_URL}/api/auth/admin/users/${id}`,
  SSO: {
    LOGIN: `${API_BASE_URL}/api/auth/sso/login`,
    REGISTER: `${API_BASE_URL}/api/auth/sso/register`,
    VERIFY: `${API_BASE_URL}/api/auth/sso/verify`,
  },
  PROFILE: {
    ME: `${API_BASE_URL}/api/auth/profile/me`,
    UPDATE: `${API_BASE_URL}/api/auth/profile/update`,
    AVATAR: `${API_BASE_URL}/api/auth/profile/avatar`,
    CHANGE_EMAIL_REQ: `${API_BASE_URL}/api/auth/profile/change-email/request`,
    CHANGE_EMAIL_VERIFY: `${API_BASE_URL}/api/auth/profile/change-email/verify`,
  },
  FORGOT: {
    REQUEST: `${API_BASE_URL}/api/auth/forgot-password/request`,
    RESET: `${API_BASE_URL}/api/auth/forgot-password/reset`,
  },
};

// ============================================================
// 📺 YOUTUBE DOWNLOADER — API /api/ytdl/*
// ============================================================
export const YTDL = {
  TRENDING: `${API_BASE_URL}/api/ytdl/trending`,
  SEARCH: `${API_BASE_URL}/api/ytdl/search`,
  INFO: `${API_BASE_URL}/api/ytdl/info`,
  DOWNLOAD: `${API_BASE_URL}/api/ytdl/download`,
  FILE: (folder, file) => `${API_BASE_URL}/api/ytdl/file/${folder}/${file}`,
};

// ============================================================
// 🧰 CÔNG CỤ & ADMIN
// ============================================================
export const TOOLS = {
  // Google Drive Commander
  DRIVER: {
    STATUS: `${API_BASE_URL}/api/dldriver/status`,
    COPY: `${API_BASE_URL}/api/dldriver/copy`,
    DOWNLOAD: `${API_BASE_URL}/api/dldriver/download`,
    PROGRESS: (taskId) => `${API_BASE_URL}/api/dldriver/progress/${taskId}`,
    STOP: (taskId) => `${API_BASE_URL}/api/dldriver/stop/${taskId}`,
  },
  // AutoCode AI
  AUTOCODE: {
    MODELS: `${API_BASE_URL}/api/autocode/models`,
    GENERATE: `${API_BASE_URL}/api/autocode/generate`,
  },
  // Upload
  UPLOAD: {
    CHECK_FOLDER: `${API_BASE_URL}/api/admin/check-folder`,
    UPLOAD_MUSIC: `${API_BASE_URL}/api/admin/upload-music`,
    UPLOAD_IMAGES: `${API_BASE_URL}/api/admin/upload-images`,
    PREVIEW: (folder, name, filename) => `${API_BASE_URL}/api/admin/preview/${folder}/${name}/${filename}`,
    SONGS: `${API_BASE_URL}/api/admin/songs`,
    SONGS_BULK: `${API_BASE_URL}/api/admin/songs/bulk`,
  },
  // Omni Downloader
  OMNI: {
    DOWNLOAD: `${API_BASE_URL}/api/omni/download`,
  },
};

// ============================================================
// 📂 PROJECTS (Không gian triển khai)
// ============================================================
export const PROJECTS = {
  LIST: `${API_BASE_URL}/api/projects/`,
  TOGGLE: (name) => `${API_BASE_URL}/api/projects/toggle/${name}`,
  UPLOAD: `${API_BASE_URL}/api/projects/upload`,
};

// ============================================================
// 📱 SOCIAL HUB (Threads-style: feed, DM, bình luận)
// ============================================================
export const SOCIAL = {
  FEED: `${API_BASE_URL}/api/social/feed`,
  POSTS: `${API_BASE_URL}/api/social/posts`,
  POST_DELETE: (id) => `${API_BASE_URL}/api/social/posts/${id}`,
  // 💬 DM (Tin nhắn)
  CONVERSATIONS: `${API_BASE_URL}/api/social/conversations`,
  CONVERSATION_OPEN: `${API_BASE_URL}/api/social/conversations`,
  CONVERSATION_MESSAGES: (id) => `${API_BASE_URL}/api/social/conversations/${id}/messages`,
  CONVERSATION_SEND: (id) => `${API_BASE_URL}/api/social/conversations/${id}/messages`,
  CONVERSATION_READ: (id) => `${API_BASE_URL}/api/social/conversations/${id}/read`,
  USER_SEARCH: (q) => `${API_BASE_URL}/api/social/users/search?q=${encodeURIComponent(q || "")}`,
  USERS: `${API_BASE_URL}/api/social/users`,
  WS_DM: (userId) => `${WS_BASE_URL}/api/ws/dm/${userId}`,
  // 💬 Bình luận & reply
  POST_COMMENTS: (postId) => `${API_BASE_URL}/api/social/posts/${postId}/comments`,
  // 🖼️ Upload ảnh (bài đăng / bình luận)
  UPLOAD_IMAGE: `${API_BASE_URL}/api/social/upload-image`,
  IMAGE: (path) => `${API_BASE_URL}${path}`,
  // 🎨 Sticker GIF
  STICKERS: `${API_BASE_URL}/api/social/stickers`,
  STICKER_FILE: (name) => `${API_BASE_URL}/api/social/sticker/${name}`,
  // 🖼️ Khung viền avatar (40 kiểu từ github d4m-dev/gif — lưu trong backend/assets/avatar_frames)
  AVATAR_FRAMES: `${API_BASE_URL}/avatar_frames.json`,                 // manifest tĩnh (danh sách + độ hiếm)
  AVATAR_FRAME_FILE: (name) => `${API_BASE_URL}/avatar_frames/${name}`, // file frame GIF/WebP/PNG
  AVATAR_FRAME_DIR: `${API_BASE_URL}/avatar_frames`,                    // thư mục gốc
  // 🐉💎 Linh thú & Linh bảo
  SPIRIT_CATALOG: `${API_BASE_URL}/api/social/spirits/catalog`,         // danh mục toàn bộ
  SPIRIT_ME: `${API_BASE_URL}/api/social/spirits/me`,                   // kho đồ + trang bị + Xu
  SPIRIT_BUY: `${API_BASE_URL}/api/social/spirits/buy`,                 // mua bằng Xu
  SPIRIT_EQUIP: `${API_BASE_URL}/api/social/spirits/equip`,             // trang bị
  SPIRIT_UNEQUIP: `${API_BASE_URL}/api/social/spirits/unequip`,         // tháo
  SPIRIT_FILE: (path) => `${API_BASE_URL}${path}`,                      // /linhbao/<file>
};

// ============================================================
// 📊 DASHBOARD & AI
// ============================================================
export const DASHBOARD = {
  SYSTEM_STATS: `${API_BASE_URL}/api/dashboard/system-stats`,
  SERVICES: `${API_BASE_URL}/api/dashboard/services`,
  TOGGLE_SERVICE: (name) => `${API_BASE_URL}/api/dashboard/services/toggle/${name}`,
  ANALYTICS: `${API_BASE_URL}/api/dashboard/analytics`,
  TASKS: `${API_BASE_URL}/api/dashboard/tasks`,
};

export const AI = {
  AUTOCODE_CHAT: `${API_BASE_URL}/api/ai-admin/chat`,
  SCHEDULES: `${API_BASE_URL}/api/ai-admin/schedules`,
  SCHEDULE: `${API_BASE_URL}/api/ai-admin/schedule`,
  CHATBOX: `${API_BASE_URL}/api/chatbox/ask`,
  ASTROLOGY_MATCH: `${API_BASE_URL}/api/astrology/match`,
  BIO: {
    CALCULATE: `${API_BASE_URL}/api/bio/calculate`,
    TRACK: `${API_BASE_URL}/api/bio/track`,
    CONFIG: (username) => `${API_BASE_URL}/api/bio/config/${username}`,
  },
};

// ============================================================
// 🔧 WIDGETS & MISC
// ============================================================
export const WIDGETS = {
  WEATHER: `${API_BASE_URL}/api/widgets/weather`,
  NOW_PLAYING: `${API_BASE_URL}/api/widgets/music/now-playing`,
  SLEEP_TIMER: `${API_BASE_URL}/api/widgets/music/sleep-timer`,
};

export const SCRIPTS = {
  LIST: `${API_BASE_URL}/api/scripts/list`,
  START: (name) => `${API_BASE_URL}/api/scripts/start/${name}`,
  STOP: (name) => `${API_BASE_URL}/api/scripts/stop/${name}`,
  LOGS: (name) => `${API_BASE_URL}/api/scripts/logs/${name}`,
  INPUT: (name) => `${API_BASE_URL}/api/scripts/input/${name}`,
  CRON_PREVIEW: `${API_BASE_URL}/api/scripts/cron-preview`,
  SCHEDULE: (name) => `${API_BASE_URL}/api/scripts/schedule/${name}`,
  UNSCHEDULE: (name) => `${API_BASE_URL}/api/scripts/unschedule/${name}`,
};

export const SECURITY = {
  RADAR: `${API_BASE_URL}/api/security/radar`,
  BLACKLIST: `${API_BASE_URL}/api/security/blacklist`,
  BAN: `${API_BASE_URL}/api/security/ban`,
  UNBAN: (ip) => `${API_BASE_URL}/api/security/unban/${ip}`,
};

export const PLAYER = {
  TRACKS: `${API_BASE_URL}/api/player/tracks`,
};

// ============================================================
// 💰 DONATE (VietQR + SePay WebSocket)
// ============================================================
export const DONATE = {
  QR: `${API_BASE_URL}/api/donate/qr`,
  SEPAy_WEBHOOK: `${API_BASE_URL}/api/donate/sepay-webhook`,
  WS: (userId) => `${WS_BASE_URL}/api/ws/donate/${userId}`,
  STATUS: (qrId) => `${API_BASE_URL}/api/donate/status/${qrId}`,
};

// ============================================================
// ⚙️ SYSTEM (config status + docs)
// ============================================================
export const SYSTEM = {
  CONFIG: `${API_BASE_URL}/api/system/config`,
  DOCS: `${API_BASE_URL}/docs`,
};

// ============================================================
// 🌐 WebSocket
// ============================================================
export const WS = {
  LOGS: `${WS_BASE_URL}/api/ws/logs`,
};

// ============================================================
// 📣 LIÊN KẾT MẠNG XÃ HỘI CHIA SẺ (ShareModal)
// ============================================================
export const SHARE = {
  FACEBOOK: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  TWITTER: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || "")}`,
  TELEGRAM: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || "")}`,
  ZALO: (url, text) => `https://zalo.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || "")}`,
};

// ============================================================
// 🎬 TÀI NGUYÊN NGOÀI (YouTube thumbnail, Google Drive)
// ============================================================
export const EXTERNAL = {
  YT_THUMB: (videoId) => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  YT_WATCH: (videoId) => `https://www.youtube.com/watch?v=${videoId}`,
  DRIVE_FOLDER: (id) => `https://drive.google.com/drive/folders/${id}`,
  DRIVE_FOLDER_EXAMPLE: "https://drive.google.com/drive/folders/1b1X...",
  PLACEHOLDER_IMG: "https://via.placeholder.com/150",
};

// ============================================================
// 🔔 NOTIFICATION (thông báo realtime)
// ============================================================
export const NOTIFICATION = {
  PUSH: `${API_BASE_URL}/api/notification/push`,
  LIST: (userId) => `${API_BASE_URL}/api/notification/list?user_id=${userId}`,
  READ: `${API_BASE_URL}/api/notification/read`,
  READ_ALL: `${API_BASE_URL}/api/notification/read-all`,
  WS: (userId) => `${WS_BASE_URL}/api/ws/notify/${userId}`,
};

// ============================================================
// 👤 PROFILE CÔNG KHAI
// ============================================================
export const PUBLIC_PROFILE = {
  DETAIL: (username) => `${API_BASE_URL}/api/users/${username}`,
};

// ============================================================
// 🎵 SONGS UPLOAD (5-in-1)
// ============================================================
export const SONGS_UPLOAD = {
  CHECK_FOLDER: (folder) => `${API_BASE_URL}/api/admin/songs/check-folder/${folder}`,
  UPLOAD: `${API_BASE_URL}/api/admin/songs/upload`,
};
