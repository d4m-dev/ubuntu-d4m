# -*- coding: utf-8 -*-
"""
============================================================
🎯 D4M MUSIC PRO — BẢNG URL TẬP TRUNG (BACKEND)
============================================================
ĐÂY LÀ FILE DUY NHẤT ĐỊNH NGHĨA MỌI ROUTE PREFIX & ĐƯỜNG DẪN
của toàn bộ backend. Muốn đổi đường dẫn API → CHỈ CẦN SỬA Ở ĐÂY,
không cần lục lọi code.

Quy ước:
  - prefix:  APIRouter(prefix=URL.<NHÓM>.PREFIX)
  - Mỗi route dùng hàm path() tương ứng.
============================================================
"""

# ============================================================
# 🎵 D4M MUSIC (module gộp) — /api/dmusic/*
# ============================================================
DMUSIC = {
    "PREFIX": "/api/dmusic",
    # Auth
    "AUTH_REGISTER": "/auth/register",
    "AUTH_LOGIN": "/auth/login",
    "AUTH_GUEST": "/auth/guest",
    # Music
    "MUSIC_HOME": "/music/home",
    "MUSIC_SEARCH": "/music/search",
    "MUSIC_PLAYLIST": "/music/playlist/{playlist_id}",
    # Library
    "LIB_LIKED": "/library/liked",
    "LIB_HISTORY": "/library/history",
    "LIB_MY_PLAYLISTS": "/library/my-playlists",
    "LIB_INTERACT": "/library/interact",
    "LIB_TOGGLE_LIKE": "/library/toggle-like",
}

# ============================================================
# 📡 AUDIO ENGINE — /api/audio/*
# ============================================================
AUDIO = {
    "PREFIX": "/api/audio",
    "HOME": "/music/home",
    "INTERACT": "/music/interact",
    "STREAM": "/stream/{project_name}/{file_name}",
    "COVER": "/cover/{project_name}/{file_name}",
    "LYRICS": "/lyrics/{project_name}/{file_name}",
    "EXTRACT": "/extract",
    "STATUS": "/status/{song_name}/{task_id}",
}

# ============================================================
# 🎵 MUSIC HUB (hệ sinh thái cũ) — /api/music/*
# ============================================================
MUSIC = {
    "PREFIX": "/api/music",
    "STREAM": "/stream/{folder}/{filename}",
    "COVER": "/cover/{folder}",
    "LYRICS": "/lyrics/{folder}",
    "LIST": "/list",
}

# ============================================================
# 🔐 AUTH / SSO — /api/auth/*
# ============================================================
AUTH = {
    "PREFIX": "/api/auth",
    "LOGIN": "/login",
    "ADMIN_USERS": "/admin/users",
    "ADMIN_TOGGLE_ACTIVE": "/admin/users/{target_id}/toggle-active",
    "ADMIN_CHANGE_ROLE": "/admin/users/{target_id}/change-role",
    "ADMIN_DELETE": "/admin/users/{target_id}",
    "SSO_LOGIN": "/sso/login",
    "SSO_REGISTER": "/sso/register",
    "SSO_VERIFY": "/sso/verify",
    "PROFILE_ME": "/profile/me",
    "PROFILE_UPDATE": "/profile/update",
    "PROFILE_AVATAR": "/profile/avatar",
    "CHANGE_EMAIL_REQ": "/profile/change-email/request",
    "CHANGE_EMAIL_VERIFY": "/profile/change-email/verify",
    "FORGOT_REQ": "/forgot-password/request",
    "FORGOT_RESET": "/forgot-password/reset",
}

# ============================================================
# 📺 YOUTUBE DOWNLOADER — /api/ytdl/*
# ============================================================
YTDL = {
    "PREFIX": "/api/ytdl",
    "INFO": "/info",
    "DOWNLOAD": "/download",
    "SEARCH": "/search",
    "TRENDING": "/trending",
    "FILE": "/file/{folder_name}/{file_name}",
}

# ============================================================
# 🧰 CÔNG CỤ & ADMIN
# ============================================================
DLDRIVER = {"PREFIX": "/api/dldriver",
            "STATUS": "/status", "COPY": "/copy", "STOP": "/stop/{task_id}", "PROGRESS": "/progress/{task_id}", "DOWNLOAD": "/download"}

AUTOCODE = {"PREFIX": "/api/autocode", "MODELS": "/models", "GENERATE": "/generate"}

OMNI = {"PREFIX": "/api/omni", "DOWNLOAD": "/download"}

ADMIN_UPLOAD = {
    "PREFIX": "/api/admin",
    "PREVIEW": "/preview/{folder_type}/{name}/{filename}",
    "CHECK_FOLDER": "/check-folder",
    "UPLOAD_MUSIC": "/upload-music",
    "UPLOAD_IMAGES": "/upload-images",
}

# ============================================================
# 📱 SOCIAL HUB — /api/social/*
# ============================================================
SOCIAL = {
    "PREFIX": "/api/social",
    "FEED": "/feed",
    "POSTS": "/posts",
    "POST_DELETE": "/posts/{post_id}",
    # 💬 DM (Tin nhắn Threads-style)
    "CONVERSATIONS": "/conversations",
    "CONVERSATION_MESSAGES": "/conversations/{conversation_id}/messages",
    "CONVERSATION_SEND": "/conversations/{conversation_id}/messages",
    "CONVERSATION_READ": "/conversations/{conversation_id}/read",
    "USER_SEARCH": "/users/search",
    # 💬 Bình luận & reply
    "POST_COMMENTS": "/posts/{post_id}/comments",
    "COMMENT_REPLY": "/comments/{comment_id}/reply",
    # 👥 Danh sách người dùng (để tạo cuộc trò chuyện)
    "USERS": "/users",
    # 🖼️ Upload ảnh (bài đăng / bình luận)
    "UPLOAD_IMAGE": "/upload-image",
    "IMAGE": "/image/{year_month}/{filename}",
    # 🎨 Sticker GIF (bài đăng / bình luận)
    "STICKERS": "/stickers",
    "STICKER_FILE": "/sticker/{filename}",
}

# ============================================================
# 📊 DASHBOARD, AI, WIDGETS, SCRIPTS, SECURITY, PLAYER, WS
# ============================================================
DASHBOARD = {"PREFIX": "/api/dashboard",
             "SYSTEM_STATS": "/system-stats", "SERVICES": "/services", "TOGGLE_SERVICE": "/services/toggle/{service_name}",
             "ANALYTICS": "/analytics", "TASKS": "/tasks"}

AI_ADMIN = {"PREFIX": "/api/ai-admin", "SCHEDULES": "/schedules", "SCHEDULE": "/schedule", "CHAT": "/chat"}

CHATBOX = {"PREFIX": "/api/chatbox", "ASK": "/ask"}

ASTROLOGY = {"PREFIX": "/api/astrology", "MATCH": "/match"}

BIO = {"PREFIX": "/api/bio", "CALCULATE": "/calculate", "TRACK": "/track", "CONFIG": "/config/{username}"}

WIDGETS = {"PREFIX": "/api/widgets",
           "WEATHER": "/weather", "NOW_PLAYING": "/music/now-playing", "SLEEP_TIMER": "/music/sleep-timer"}

PLAYER = {"PREFIX": "/api/player", "TRACKS": "/tracks"}

PROJECTS = {"PREFIX": "/api/projects", "LIST": "/", "TOGGLE": "/toggle/{project_name}", "UPLOAD": "/upload"}

SCRIPTS = {"PREFIX": "/api/scripts",
           "LIST": "/list", "START": "/start/{script_name}", "STOP": "/stop/{script_name}", "LOGS": "/logs/{script_name}",
           "INPUT": "/input/{script_name}", "CRON_PREVIEW": "/cron-preview", "SCHEDULE": "/schedule/{script_name}", "UNSCHEDULE": "/unschedule/{script_name}"}

SECURITY = {"PREFIX": "/api/security",
            "RADAR": "/radar", "BLACKLIST": "/blacklist", "BAN": "/ban", "UNBAN": "/unban/{ip}"}

TELEGRAM = {"PREFIX": "/api/telegram", "REPORT_SYSTEM": "/report/system", "REPORT_WEATHER": "/report/weather"}

WS = {"PREFIX": "/api/ws", "LOGS": "/logs", "WS_DM": "/dm/{user_id}"}

# ============================================================
# 💰 DONATE (VietQR + SePay Webhook + WebSocket realtime)
# ============================================================
DONATE = {
    "PREFIX": "/api/donate",
    "QR": "/qr",
    "SEPAY_WEBHOOK": "/sepay-webhook",
    "WS_DONATE": "/donate/{user_id}",  # path con của WS.PREFIX (/api/ws)
}

# ============================================================
# 🔔 NOTIFICATION (thông báo realtime)
# ============================================================
NOTIFICATION = {
    "PREFIX": "/api/notification",
    "PUSH": "/push",
    "LIST": "/list",
    "READ": "/read",
    "READ_ALL": "/read-all",
    "WS_NOTIFY": "/notify/{user_id}",
}

# ============================================================
# 👤 PROFILE CÔNG KHAI
# ============================================================
USERS = {
    "PREFIX": "/api/users",
    "DETAIL": "/{username}",
}

# ============================================================
# ⚙️ SYSTEM (config status)
# ============================================================
SYSTEM = {
    "PREFIX": "/api/system",
    "CONFIG": "/config",
}

# ============================================================
# 🎵 SONGS UPLOAD (5-in-1)
# ============================================================
SONGS_UPLOAD = {
    "PREFIX": "/api/admin/songs",
    "CHECK_FOLDER": "/check-folder/{folder_name}",
    "UPLOAD": "/upload",
}
