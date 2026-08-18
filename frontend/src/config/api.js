// src/config/api.js
// ============================================================
// LỚP TƯƠNG THÍCH — MỌI URL THẬT SỰ NẰM Ở src/config/urls.js
// File này chỉ ánh xạ lại sang urls.js để giữ tên ENDPOINTS cũ.
// Muốn đổi đường dẫn → sửa duy nhất ở src/config/urls.js
// ============================================================
import {
  API_BASE_URL,
  WS_BASE_URL,
  AUTH,
  YTDL,
  AUDIO,
  DMUSIC,
  MUSIC_HUB,
  TOOLS,
  SOCIAL,
  AI,
  WS,
  DONATE,
  NOTIFICATION,
  PUBLIC_PROFILE,
  SONGS_UPLOAD,
  PROJECTS,
} from "./urls";

export { API_BASE_URL, WS_BASE_URL };

export const ENDPOINTS = {
  AUTH: {
    LOGIN: AUTH.SSO.LOGIN,
    REGISTER: AUTH.SSO.REGISTER,
    VERIFY: AUTH.SSO.VERIFY,
    PROFILE_ME: AUTH.PROFILE.ME,
    UPDATE: AUTH.PROFILE.UPDATE,
    AVATAR: AUTH.PROFILE.AVATAR,
    CHANGE_EMAIL_REQ: AUTH.PROFILE.CHANGE_EMAIL_REQ,
    CHANGE_EMAIL_VERIFY: AUTH.PROFILE.CHANGE_EMAIL_VERIFY,
    FORGOT_REQ: AUTH.FORGOT.REQUEST,
    FORGOT_RESET: AUTH.FORGOT.RESET,
  },
  YTDL: {
    TRENDING: YTDL.TRENDING,
    SEARCH: YTDL.SEARCH,
    INFO: YTDL.INFO,
    DOWNLOAD: YTDL.DOWNLOAD,
  },
  AUDIO: {
    EXTRACT: AUDIO.EXTRACT,
    STATUS: AUDIO.STATUS,
    HOME: AUDIO.HOME,
    INTERACT: AUDIO.INTERACT,
    STREAM: AUDIO.STREAM,
    COVER: AUDIO.COVER,
    LYRICS: AUDIO.LYRICS,
  },
  MUSIC: {
    HOME: AUDIO.HOME,
    INTERACT: AUDIO.INTERACT,
    STREAM: AUDIO.STREAM,
    COVER: AUDIO.COVER,
    LYRICS: AUDIO.LYRICS,
    LIST: MUSIC_HUB.LIST,
  },
  MUSIC_ADMIN: {
    UPLOAD: (kind) => `${API_BASE_URL}/api/upload?kind=${kind}`,
    SONGS: TOOLS.UPLOAD.SONGS,
    BULK: TOOLS.UPLOAD.SONGS_BULK,
  },
  ARTIST: {
    DETAIL: (name) => `${API_BASE_URL}/api/artists/${name}`,
    FOLLOW: (name) => `${API_BASE_URL}/api/artists/${name}/follow`,
  },
  LIBRARY: {
    HISTORY: `${API_BASE_URL}/api/library/history`,
    LIKED: `${API_BASE_URL}/api/library/liked`,
    ARTISTS: `${API_BASE_URL}/api/library/artists`,
  },
  PLAYLISTS: {
    BASE: `${API_BASE_URL}/api/playlists`,
  },
  SONGS: {
    DETAIL: (id) => `${API_BASE_URL}/api/songs/${id}`,
    LRC: (id) => `${API_BASE_URL}/api/admin/songs/${id}/lrc`,
  },
  SEARCH_ALL: `${API_BASE_URL}/api/search`,
  RECAP: `${API_BASE_URL}/api/library/recap`,
  ASTROLOGY: {
    MATCH: AI.ASTROLOGY_MATCH,
  },
  SOCIAL: {
    POSTS: SOCIAL.POSTS,
    POST_DELETE: SOCIAL.POST_DELETE,
    FEED: SOCIAL.FEED,
    POST_COMMENTS: SOCIAL.POST_COMMENTS,
    UPLOAD_IMAGE: SOCIAL.UPLOAD_IMAGE,
    STICKERS: SOCIAL.STICKERS,
    STICKER_FILE: SOCIAL.STICKER_FILE,
    AVATAR_FRAMES: SOCIAL.AVATAR_FRAMES,
    AVATAR_FRAME_FILE: SOCIAL.AVATAR_FRAME_FILE,
  },
  BIO: {
    CALCULATE: AI.BIO.CALCULATE,
    TRACK: AI.BIO.TRACK,
  },
  PROJECTS: {
    LIST: PROJECTS.LIST,
    TOGGLE: PROJECTS.TOGGLE,
    UPLOAD: PROJECTS.UPLOAD,
  },
  AI_ADMIN: {
    CHAT: AI.AUTOCODE_CHAT,
  },
  DLDRIVER: {
    STATUS: TOOLS.DRIVER.STATUS,
    COPY: TOOLS.DRIVER.COPY,
    DOWNLOAD: TOOLS.DRIVER.DOWNLOAD,
    PROGRESS: TOOLS.DRIVER.PROGRESS,
    STOP: TOOLS.DRIVER.STOP,
  },
  AUTOCODE: {
    MODELS: TOOLS.AUTOCODE.MODELS,
    GENERATE: TOOLS.AUTOCODE.GENERATE,
  },
  LOGS_WS: WS.LOGS,
  // 💰 Donate
  DONATE: {
    QR: DONATE.QR,
    SEPAY_WEBHOOK: DONATE.SEPAy_WEBHOOK,
    WS: DONATE.WS,
  },
  // 🔔 Notification
  NOTIFICATION: {
    PUSH: NOTIFICATION.PUSH,
    LIST: NOTIFICATION.LIST,
    READ: NOTIFICATION.READ,
    READ_ALL: NOTIFICATION.READ_ALL,
    WS: NOTIFICATION.WS,
  },
  // 👤 Profile công khai
  PUBLIC_PROFILE: {
    DETAIL: PUBLIC_PROFILE.DETAIL,
  },
  // 📊 Music analytics
  MUSIC_ANALYTICS: `${API_BASE_URL}/api/dashboard/music-analytics`,
  // 🎵 Songs Upload (5-in-1)
  SONGS_UPLOAD: {
    CHECK_FOLDER: SONGS_UPLOAD.CHECK_FOLDER,
    UPLOAD: SONGS_UPLOAD.UPLOAD,
  },
};

export const STATIC = {
  DEFAULT_AVATAR: "/src/assets/favicon/favicon-96x96.png",
};
