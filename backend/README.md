# 🖥️ D4M Backend — Ubuntu Core (FastAPI)

> **Backend** của hệ sinh thái **D4M** — nền tảng API tập trung cho toàn bộ dịch vụ
> (Music, Social, Tools, Auth/SSO, Dashboard, AI...).

---

## 🚀 Giới thiệu

`ubuntu-d4m/backend` là **trái tim API** của hệ sinh thái D4M, viết bằng **Python + FastAPI**.
Nó quản lý mọi dữ liệu, xác thực, streaming nhạc, công cụ AI, mạng xã hội và dashboard — tất cả qua một điểm duy nhất.

| Thành phần | Giá trị |
|-----------|---------|
| Framework | FastAPI (Python 3.10+) |
| Port mặc định | `16868` |
| Database | MariaDB / MySQL (`social_hub`) |
| Cache / Rate-limit | Redis |
| Streaming media | HTTP Range (audio/video) |
| Auth | JWT + bcrypt |

---

## 🧩 Cấu trúc thư mục

```
backend/
├── main.py                # ⭐ Entry toàn bộ hệ sinh thái (port 16868)
├── run_music_demo.py      # ⭐ Entry chạy riêng phần Music (demo nhanh)
├── test_security.py       # Bộ test bảo mật (rate-limit + JWT blacklist)
├── requirements.txt       # Danh sách dependencies
├── .env.example           # Bản mẫu cấu hình (sao chép thành .env)
│
├── api/                   # 🚀 CÁC ROUTER (điểm truy cập API)
│   ├── server.py          # App FastAPI + middleware + đăng ký router
│   ├── auth.py            # 🔐 Auth/SSO, admin user, logout (blacklist JWT)
│   ├── d4m_music.py       # 🎵 D4M Music Pro (auth, music, library)
│   ├── audio_engine.py    # 📡 Streaming / Cover / Lyrics / Extract (+ rate-limit)
│   ├── music.py           # Music Hub (stream/cover/lyrics/list)
│   ├── social.py          # 📱 Social Hub (feed, posts)
│   ├── dashboard.py       # 📊 Dashboard (stats, services, analytics)
│   ├── ytdl.py            # 📺 YouTube Downloader
│   ├── dldriver.py        # 📁 Google Drive Commander
│   ├── autocode.py        # 🧠 AutoCode AI
│   ├── ai_admin.py        # 🤖 AI Admin (schedules, chat)
│   ├── chatbox.py         # J.A.R.V.I.S Chat
│   ├── astrology.py       # 🔮 Astrology match
│   ├── bio_premium.py     # Bio Premium (calculate, track)
│   ├── widgets.py         # Widgets (weather, now-playing)
│   ├── player.py          # Player tracks
│   ├── projects.py        # Quản lý dự án
│   ├── upload.py          # Admin upload (nhạc, ảnh)
│   ├── admin_scripts.py   # Admin scripts / cron
│   ├── admin_security.py  # Security radar / blacklist
│   ├── system.py          # ⚙️ System config status
│   ├── omni_dl.py         # Omni Downloader
│   ├── telegram_bot.py    # Telegram bot
│   ├── websockets.py      # WebSocket (logs)
│   └── cleanup.py
│
├── core/                  # 🧱 LÕI DỊCH VỤ
│   ├── config.py          # Cấu hình (pydantic-settings, từ .env)
│   ├── security.py        # JWT, bcrypt, verify/decode token
│   ├── rate_limit.py      # 🛡️ Rate limiter + JWT blacklist (Redis)
│   ├── database.py        # MariaDB pool + executor
│   ├── db_schema.py       # Định nghĩa 26 bảng database
│   ├── urls.py            # 🎯 Bảng URL tập trung (prefix + path)
│   ├── scheduler.py       # Lập lịch tác vụ
│   ├── tunnel.py          # Cloudflare Zero Trust tunnel
│   ├── telegram.py / tg_* # Telegram bot lõi
│   ├── gcal.py            # Google Calendar
│   └── task.py            # Celery task
│
├── services/              # ⚙️ LỚP DỊCH VỤ (xử lý nghiệp vụ)
│   ├── sso_service.py     # Auth/SSO
│   ├── music_service.py   # Truy cập DB music
│   ├── profile_service.py # Hồ sơ người dùng
│   ├── admin_user_service.py
│   ├── ai_engine.py       # AI (Gemini)
│   ├── astrology_service.py
│   ├── bio_service.py
│   ├── email_service.py   # Gửi email OTP
│   └── scheduler.py
│
├── schemas/               # 📦 Pydantic schemas
│   ├── auth_schemas.py, ai_schemas.py, astrology_schemas.py, bio_schemas.py
│
├── middlewares/           # 🛡️ MIDDLEWARE
│   ├── rate_limit.py, security.py, ip_shield.py, logger_tracker.py,
│   ├── dynamic_hosting.py, auto_branding.py, security_headers.py
│
├── scripts/               # 🛠️ Script tiện ích
│   ├── deploy.py, gen_security_report.py, scan_sizes.py, test_security.py...
│
└── audio_workspace/       # 🎵 Thư mục media (nhạc, cover, lyrics)
    └── music/<folder_name>/
```

---

## 🔌 Bảng API (Router Prefix)

| Prefix | Chức năng |
|--------|-----------|
| `/api/auth` | Auth/SSO, admin user, logout |
| `/api/dmusic` | 🎵 D4M Music Pro (auth, home, search, playlist, library) |
| `/api/audio` | 📡 Stream / Cover / Lyrics / Extract (có rate-limit) |
| `/api/music` | Music Hub (stream/cover/lyrics/list) |
| `/api/social` | Social Hub (feed, posts) |
| `/api/dashboard` | Thống kê hệ thống, services, analytics |
| `/api/ytdl` | YouTube Downloader |
| `/api/dldriver` | Google Drive Commander |
| `/api/autocode` | AutoCode AI |
| `/api/ai-admin` | AI Admin (schedules, chat) |
| `/api/chatbox` | J.A.R.V.I.S Chat |
| `/api/astrology` | Astrology match |
| `/api/bio` | Bio Premium |
| `/api/widgets` | Weather, now-playing, sleep-timer |
| `/api/player` | Player tracks |
| `/api/projects` | Quản lý dự án |
| `/api/admin` | Upload nhạc/ảnh |
| `/api/scripts` | Admin scripts/cron |
| `/api/security` | Security radar/blacklist |
| `/api/system` | ⚙️ System config status |
| `/api/omni` | Omni Downloader |
| `/api/bot` | Telegram bot |
| `/api/ws` | WebSocket |
| `/api/donate` | 💰 Donate (QR VietQR + SePay webhook) |
| `/api/ws/donate/{user_id}` | 💰 Donate WebSocket realtime |

> **🎯 URL tập trung**: mọi prefix/path định nghĩa tại `core/urls.py` — muốn đổi đường dẫn chỉ sửa 1 chỗ.

---

## 🛡️ Bảo mật nâng cao

### Rate Limiting (chống DDoS / leech băng thông)
- Áp dụng cho `/api/audio/stream/` — tối đa **50 requests/phút/IP** qua Redis
- Vượt ngưỡng → **HTTP 429** + header `Retry-After`
- Fixed-window atomic (`INCR + EXPIRE`), fail-open khi Redis down
- Module: `core/rate_limit.py`

### JWT Blacklist (vô hiệu hoá token khi Logout)
- Mỗi token có `jti` duy nhất
- `POST /api/auth/logout` → token vào Redis blacklist, vô hiệu hoá ngay
- `verify_token` / `decode_token` chặn token đã blacklist → **HTTP 401**
- Module: `core/rate_limit.py` + `core/security.py`

### Kiểm tra bảo mật tự động
```bash
./venv/bin/python -m pytest test_security.py -v
```
- Spam request → assert **HTTP 429**
- Token đã logout / hết hạn / thiếu → assert **HTTP 401**

### Phân quyền active=1
- Các tính năng nhạy cảm (GG Drive, J.A.R.V.I.S, AI) chỉ **user có `active = 1`** mới dùng được.
- `get_current_active_user` (core/security.py) đọc `active` thật từ DB mỗi request:
  - Token thiếu/hỏng/hết hạn/blacklist → **401**
  - User không tồn tại / `active != 1` → **403**
  - GG Drive thêm yêu cầu **role admin** (`require_active_admin`).

---

## 📁 Google Drive Commander — cách kích hoạt

Trang `/tools/download-ggdriver` cần cấu hình Google Drive mới hoạt động:

1. **Tạo OAuth Client ID (Desktop)** tại [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Bật *Google Drive API*
   - Scopes: `https://www.googleapis.com/auth/drive`
   - Tải JSON → đặt tên `credentials.json` trong `backend/auth/`

2. **Sinh token** (đăng nhập Google 1 lần):
```bash
cd backend
./venv/bin/python scripts/setup_google_drive.py
```
→ tạo `backend/auth/token.json`

3. Xong — trang hoạt động. Badge trạng thái tự hiển thị tiến trình cấu hình.

---

## 💰 Donate & Kích hoạt tài khoản (SePay)

Backend hỗ trợ donate + tự động nâng cấp tài khoản theo thời gian thực:

### Cấu hình (backend/.env)
```bash
# Token bảo mật để xác thực Webhook từ SePay
SEPAy_TOKEN=chuoi-bi-mat-cua-ban

# Thông tin ngân hàng cho mã QR VietQR
BANK_ID=MB
BANK_ACCOUNT=0123456789
BANK_ACCOUNT_NAME=LY THUA AN
```

### Cài đặt bảng dữ liệu
```bash
mysql -u d4m -padmin123 social_hub < ../database/donate_table.sql
```

### Cách SePay gọi Webhook
- **URL**: `POST /api/donate/sepay-webhook`
- **Header**: `Authorization: Bearer <SEPAy_TOKEN>`
- **Body**: `{ "transferAmount": 50000, "content": "D4M 1", "transID": "...", "time": "..." }`
- Nội dung chuyển khoản phải có định dạng `D4M {user_id}`.

### Luồng
`QR tĩnh VietQR` → user chuyển khoản → `SePay Webhook` → verify token → regex tách user_id → `active=1` → lưu `donate_logs` → `WebSocket` notify realtime → frontend "Cảm ơn sếp!"

---

## 🚀 Cách chạy

### 0. Yêu cầu
- Python 3.10+, MariaDB/MySQL, Redis 6+

### 1. Cấu hình môi trường
```bash
cp .env.example .env   # chỉnh DB_PASS, SECRET_KEY, GEMINI_API_KEY...
```
> Đảm bảo MariaDB có database `social_hub` và Redis đang chạy (cần cho rate-limit).

### 2. Cài dependencies
```bash
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Khởi tạo Database (nếu chưa)
```bash
mysql -u d4m -padmin123 social_hub < ../database/schema_full.sql
```

### 4. Chạy
```bash
# Toàn bộ hệ sinh thái
python main.py

# Chỉ riêng phần Music (demo nhanh, không khởi động Redis/Tunnel/Telegram)
python run_music_demo.py
```

- **API**: http://localhost:16868
- **Swagger Docs**: http://localhost:16868/docs
- **DB Adminer**: http://localhost:8888 (cổng DB_ADMIN_PORT)

### 5. Kiểm tra sức khoẻ
```bash
curl http://localhost:16868/api/system/config
curl http://localhost:16868/api/health   # (nếu có)
```

---

## 🧪 Chạy test

```bash
# Test bảo mật (rate-limit + blacklist)
./venv/bin/python -m pytest test_security.py -v

# Script kiểm tra security report
./venv/bin/python scripts/gen_security_report.py
```

---

## 🐳 Docker

Backend đã có `Dockerfile`. Chạy cùng toàn bộ hệ sinh thái (MariaDB + Redis + Frontend):
```bash
cd .. && docker compose up -d
```

---

## 🔑 Biến môi trường quan trọng

| Biến | Mô tả | Bắt buộc |
|------|-------|----------|
| `PORT` | Cổng API (16868) | ✅ |
| `SECRET_KEY` | Khóa JWT (đổi ngay) | ✅ |
| `ADMIN_PASSWORD` | Mật khẩu admin | ✅ |
| `DB_HOST/PORT/USER/PASS/NAME` | Kết nối MariaDB | ✅ |
| `REDIS_HOST/PORT` | Redis (rate-limit/blacklist) | ✅ |
| `GEMINI_API_KEY` | AI (J.A.R.V.I.S, AutoCode) | ⚠️ |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | ⚠️ |
| `CLOUDFLARE_TUNNEL_TOKEN` | Zero Trust | ⚠️ |

---

## 📜 Tác giả

**D4MDEV - Lý Ân** — © 2026. Backend của hệ sinh thái D4M.
