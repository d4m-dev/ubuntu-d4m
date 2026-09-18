# 🎧 D4M Music Pro — Bản gộp Hệ sinh thái D4M + Music

> **Monorepo**: `ubuntu-d4m` — gộp `ubuntu-frontend` + `ubuntu-backend` (Hệ sinh thái D4M) tích hợp **toàn bộ chức năng**: D4M Music Pro, SSO, Social Hub, Công cụ, Dashboard, Quản trị...

---

## 🌟 Tổng quan

**D4M Music Pro** là bản gộp **toàn diện** của hệ sinh thái **D4MDEV - Lý Ân**, bao gồm:

| Nhóm | Chức năng |
|------|-----------|
| 🎵 **Music** | Nền tảng nghe nhạc trực tuyến (player, playlist, thư viện, lyrics...) |
| 🔐 **SSO/Auth** | Đăng nhập, đăng ký, xác thực, quản lý hồ sơ |
| 📱 **Social Hub** | Bài viết, feed, Numerology, Venus |
| 🛠️ **Công cụ** | YouTube Downloader, Vocal Remover, Google Drive Commander, AutoCode, Jarvis Chat |
| 📊 **Dashboard** | Thống kê hệ thống, dịch vụ, phân tích |
| 🧠 **AI** | AutoCode, Jarvis AI, Astrology, Bio Premium |

---

## 📋 Mục lục

1. [Giới thiệu](#-giới-thiệu)
2. [Tính năng](#-tính-năng)
3. [Kiến trúc / Cấu trúc thư mục](#-kiến-trúc--cấu-trúc-thư-mục)
4. [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
5. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
6. [Hướng dẫn cài đặt chi tiết](#-hướng-dẫn-cài-đặt-chi-tiết)
7. [Demo tính năng](#-demo-tính-năng)
8. [Tài khoản demo](#-tài-khoản-demo)
9. [Cách sử dụng](#-cách-sử-dụng)
10. [Bảo mật & Chất lượng](#-bảo-mật--chất-lượng-code-đã-cải-thiện)
11. [Triển khai Production](#-triển-khai-production)
12. [Quyền tác giả](#-quyền-tác-giả)

---

## 🌟 Giới thiệu

**D4M Music Pro** là nền tảng nghe nhạc trực tuyến full-stack được xây dựng bởi **D4MDEV - Lý Ân**. Đây là bản **gộp** duy nhất, kết hợp:

- **Frontend** — giao diện nghe nhạc hiện đại (React + Vite + Tailwind)
- **Backend** — API hệ sinh thái D4M (FastAPI) + module Music riêng
- **Database** — MariaDB/MySQL với schema `songs`, `playlists`, `song_likes`, `song_views`...

Bản gộp này giữ nguyên toàn bộ hệ sinh thái D4M (SSO, Social, Tools...) đồng thời **ghi đè module Music** bằng phiên bản nghe nhạc mới, mượt mà, có đầy đủ player + thư viện cá nhân.

---

## ✨ Tính năng

### 🎵 Nghe nhạc
- **Trang chủ**: bài hát **Thịnh hành** (top lượt nghe) + **Danh sách phát công khai**
- **Tìm kiếm** bài hát theo tên / nghệ sĩ (hỗ trợ tiếng Việt)
- **Chi tiết Playlist**: xem danh sách bài, phát toàn bộ
- **Player đầy đủ**:
  - Play / Pause
  - Next / Previous
  - **Seek (kéo tua)** — hỗ trợ HTTP Range
  - Shuffle (phát ngẫu nhiên)
  - Repeat (lặp 1 bài / lặp tất cả)
  - Điều chỉnh âm lượng
  - **Lời bài hát đồng bộ theo thời gian** (LRC)

### 💚 Cá nhân hóa
- Đăng ký / Đăng nhập / Đăng nhập Khách
- **Thả tim** (like) bài hát
- **Thư viện cá nhân**: Bài hát đã thích, Lịch sử nghe
- Ghi nhận lượt nghe, lượt tải

### 🛠️ Quản trị
- Trang **Admin** thống kê kho nhạc (tổng bài, lượt nghe, lượt thích)
- Phân quyền Admin / Người dùng

### 🧩 Hệ sinh thái D4M (đầy đủ)
- **SSO/Auth**: login, sso/register, sso/verify, quản lý hồ sơ, đổi email, quên mật khẩu
- **Social Hub**: feed, đăng bài, xóa bài, Numerology, Venus
- **Công cụ**: YouTube Downloader (ytdl), Vocal Remover (audio_engine extract), Google Drive Commander (dldriver), AutoCode AI
- **Dashboard**: system-stats, services, analytics
- **AI**: AutoCode generate, Jarvis chatbox, Astrology match, Bio Premium
- **WebSocket**: /api/ws (logs, realtime)
- **Admin**: upload nhạc, upload ảnh, security radar/blacklist, scripts/cron
- **Telegram Bot**: báo cáo hệ thống, thời tiết

### 🖼️💎 Cá nhân hóa Social Hub (Khung viền + Linh thú + Linh bảo)

| Tính năng | Mô tả |
|-----------|-------|
| 🖼️ **Khung viền Avatar** | **429 khung** (`backend/assets/avatar_frames/`, chủ yếu loạt `khung-*`), phân 4 cấp độ hiếm: **Thường / Hiếm / Sử thi / Huyền thoại** (viền màu tương ứng trong bảng chọn) |
| 🐉 **Linh thú** | 19 thú (hồ ly cửu vĩ, kỳ lân, huyền long, phượng hoàng...) — kho đồ, mua bằng **Xu** (`players.xu`), trang bị / tháo, hiển thị aura góc phải avatar |
| 💎 **Linh bảo** | 146 báu vật / hộ thể (kiếm tiên, cờ, tháp, Thần Tài, Na Tra...) hiển thị aura góc trái avatar |
| 🎨 **Hiển thị** | Art nền đen kiểu game → `mix-blend-mode: screen` xóa nền đen, nổi như hào quang quanh avatar trên nền tối |
| ⚡ **Chịu tải lớn** | Picker 429 khung / 165 linh vật có **tìm kiếm + lọc độ hiếm + phân trang "Xem thêm"**; ảnh tĩnh serve với `Cache-Control: immutable` (tải 1 lần) |
| 📍 **Đồng bộ** | Bảng tin (feed), bình luận, tin nhắn DM, hộp thư, hồ sơ công khai — tất cả đều render khung + linh thú + linh bảo của từng người |

> 📋 Danh sách phân loại thú/báu vật nằm ở `backend/assets/linhbao_classification.md`.
> Muốn chuyển mục nào sang nhóm kia, hoặc đổi độ hiếm / giá: sửa **`backend/assets/spirit_items.json`** rồi restart backend (backend tự UPSERT danh mục vào DB khi khởi động).

**API (prefix `/api/social/spirits`)**

| Method | Đường dẫn | Chức năng |
|--------|-----------|-----------|
| GET | `/catalog` | Danh mục toàn bộ Linh thú + Linh bảo (kèm trạng thái sở hữu/trang bị) |
| GET | `/me` | Kho đồ của tôi + trang bị hiện tại + số Xu |
| POST | `/buy` | Mua vật phẩm bằng Xu (trừ nguyên tử, chống race) |
| POST | `/equip` | Trang bị vật phẩm đã sở hữu |
| POST | `/unequip` | Tháo trang bị (`{"kind": "pet"\|"treasure"}`) |
| POST | `/admin/grant` | Admin tặng vật phẩm cho user (`{"user_id", "item_id"}`) |

**Thêm / sửa vật phẩm (không cần sửa code)**

1. Thả ảnh (PNG/GIF/WebP, nền đen kiểu game là đẹp nhất) vào `backend/assets/linhbao/`
2. Thêm 1 entry vào `backend/assets/spirit_items.json`:
   ```json
   {"id": "ten-file", "kind": "pet", "name": "Tên Hiển Thị", "description": "Mô tả",
    "image": "/linhbao/ten-file.webp", "rarity": "epic", "price_xu": 200000, "zorder": 3}
   ```
3. Restart backend → danh mục tự UPSERT vào bảng `spirit_items`.
   (Hoặc tặng trực tiếp cho user: `POST /api/social/spirits/admin/grant` `{"user_id", "item_id"}`)
4. Khung viền mới: thả file vào `backend/assets/avatar_frames/` rồi thêm entry vào `backend/assets/avatar_frames.json` (`rarity`: `common|rare|epic|legendary`).

**Nâng cấp DB đã chạy sẵn** (DB mới KHÔNG cần — backend tự tạo bảng + cột khi khởi động):

```bash
mysql -u d4m -padmin123 social_hub < database/spirit_items.sql
```

**Đồng bộ tính năng vào clone riêng** (file patch nằm ở root repo):

```bash
git am KHUNG_LINHTHU_LINHBAO.patch     # hoặc: git apply KHUNG_LINHTHU_LINHBAO.patch
```

**Cấu trúc hệ thống Cá nhân hóa (1 mối, không rải rác)**

```
backend/assets/avatar_frames/          # 429 khung viền thật
backend/assets/avatar_frames.json      # manifest khung (+ rarity) — backend serve /avatar_frames.json
backend/assets/linhbao/                # 165 art Linh thú + Linh bảo (nền đen)
backend/assets/spirit_items.json       # 👑 NGUỒN SỰ THẬT: catalog (kind/rarity/giá) — tự UPSERT vào DB khi khởi động
backend/assets/linhbao_classification.md  # danh sách phân loại thú/báu vật để duyệt
backend/api/spirit.py                  # API /api/social/spirits/* (catalog, me, buy, equip, unequip, admin/grant)
backend/services/spirit_service.py     # SQL fragment + formatter + sync_catalog_from_manifest()
backend/tests/test_spirit_suite.py     # test suite (pip install sqlglot fastapi ... rồi chạy)
database/spirit_items.sql              # migration cho DB cũ (DB mới tự tạo)
frontend/src/pages/social/*            # AvatarFrame (badge aura), CustomizationPanel (4 tab), feed/DM/comments
```

---

## 🧱 Kiến trúc / Cấu trúc thư mục

```
ubuntu-d4m/
├── frontend/                          # React 19 + Vite 8 + Tailwind v4
│   ├── vite.config.js                 # Cấu hình proxy /api → backend
│   ├── .env                           # VITE_API_BASE_URL / VITE_WS_BASE_URL
│   └── src/
│       ├── App.jsx                    # Routing tổng hệ sinh thái
│       ├── main.jsx
│       ├── pages/
│       │   ├── music/D4MusicPlayer.jsx    # ⭐ Entry Music (mount /music/*)
│       │   ├── music/pages/               # Home, Search, Playlist, Library, Liked,
│       │   │                              # History, Admin, Login, Register
│       │   ├── tools/                     # YtDownloader, VocalRemove, JarvisChat,
│       │   │                              # GgDriveCommander, AutoCode
│       │   ├── social/                    # SocialHub, Numerology, Venus
│       │   ├── admin/ProfilePage.jsx
│       │   └── HomePage, HubPage, AuthPage
│       ├── components/music/          # contexts, Layout, Sidebar, BottomPlayer, ui, music.css
│       └── api/client.js              # API client (fetch + token)
│
├── backend/                           # FastAPI "siêu hệ sinh thái D4M"
│   ├── main.py                        # Chạy TOÀN BỘ hệ sinh thái (Port 16868)
│   ├── run_music_demo.py              # ⭐ Chạy riêng Music (demo nhanh)
│   ├── requirements.txt
│   ├── .env                           # Cấu hình DB, secret (KHÔNG commit)
│   ├── api/                           # 21 router hệ sinh thái
│   │   ├── d4m_music.py               # ⭐ Module Music: /api/dmusic/*
│   │   ├── audio_engine.py            # Stream / Cover / Lyrics / Extract
│   │   ├── auth.py, social.py, dashboard.py, ytdl.py, dldriver.py,
│   │   ├── autocode.py, ai_admin.py, bio_premium.py, astrology.py,
│   │   ├── chatbox.py, widgets.py, websockets.py, music.py, player.py,
│   │   ├── admin_scripts.py, admin_security.py, upload.py, telegram_bot.py,
│   │   ├── omni_dl.py, projects.py, cleanup.py
│   │   └── server.py                  # Đăng ký router + middleware
│   ├── core/                          # database, security, db_schema, scheduler...
│   ├── services/                      # music_service, ai_engine, ...
│   └── audio_workspace/music/         # File nhạc + ảnh bìa + lời (45 bài)
│
└── database/
    └── music_seed.sql                 # ⭐ Schema + dữ liệu mẫu Music (45 bài)
```

---

## 🛠️ Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| **Frontend** | React 19, Vite 8, React Router 7, TanStack Query, Tailwind CSS v4, shadcn/ui, sonner |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy/PyMySQL |
| **Database** | MariaDB / MySQL 8+ |
| **Auth** | JWT (PyJWT), bcrypt / passlib |
| **Media** | Streaming HTTP Range (audio), ffmpeg (xử lý âm thanh) |

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** 18+ (khuyến nghị 20+)
- **Python** 3.10+
- **MariaDB / MySQL** 8+
- **Redis** 6+ — bắt buộc cho Rate Limiting & JWT Blacklist (nếu thiếu, hệ thống vẫn chạy nhưng giảm lớp bảo vệ DDoS)
- **(Tùy chọn) ffmpeg** — cho module tách beat / xử lý audio AI

---

## 📦 Hướng dẫn cài đặt chi tiết

### Bước 0. Giải nén
```bash
# Nếu dùng file zip (ubuntu-d4m-full.zip hoặc ubuntu-d4m-source.zip)
unzip ubuntu-d4m-full.zip
cd ubuntu-d4m
```

---

### Bước 1. Cài đặt Database (MariaDB/MySQL)

**1.1. Tạo database + user**
```bash
# Đăng nhập MySQL với quyền root
sudo mariadb

-- Trong MySQL prompt:
CREATE DATABASE IF NOT EXISTS social_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'd4m'@'127.0.0.1' IDENTIFIED BY 'admin123';
GRANT ALL PRIVILEGES ON *.* TO 'd4m'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

**1.2. Nạp dữ liệu mẫu**
```bash
# Nạp TOÀN BỘ (schema hệ sinh thái + 45 bài hát + playlist + người dùng + social posts + players)
mysql -u d4m -padmin123 social_hub < database/schema_full.sql

# Hoặc nạp riêng từng phần:
mysql -u d4m -padmin123 social_hub < database/music_seed.sql       # nhạc + playlist + admin
mysql -u d4m -padmin123 social_hub < database/ecosystem_seed.sql   # users demo + posts + players + settings
```

> 💡 Nếu bạn dùng tên/ mật khẩu DB khác, cập nhật lại trong `backend/.env`:
> ```
> DB_HOST=127.0.0.1
> DB_PORT=3306
> DB_USER=d4m
> DB_PASS=admin123
> DB_NAME=social_hub
> ```

---

### Bước 2. Cài đặt Backend

```bash
cd backend

# Tạo môi trường ảo Python
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Cài dependencies
pip install -r requirements.txt

# Kiểm tra cấu hình .env
# Đảm bảo DB_USER / DB_PASS / DB_NAME khớp với DB bạn đã tạo ở Bước 1
```

**2.1. Chạy nhanh phần Music (demo)**
```bash
python run_music_demo.py
# Backend lên sóng tại: http://localhost:16868
# API Docs (Swagger): http://localhost:16868/docs
```

**2.2. Hoặc chạy toàn bộ hệ sinh thái D4M**
```bash
python main.py
# Port 16868 — kèm các dịch vụ phụ (Redis, Telegram, Tunnel...)
# Yêu cầu cấu hình đầy đủ .env
```

**2.3. Cấu hình `.env` (bản mẫu đầy đủ)**
Sao chép file mẫu và điền giá trị của bạn:
```bash
cp .env.example .env
```
File `.env.example` chứa hướng dẫn cho **mọi dịch vụ**:
| Biến | Dịch vụ | Bắt buộc? |
|------|---------|-----------|
| `SECRET_KEY` | JWT Auth | ✅ Bắt buộc (đổi ngay) |
| `ADMIN_PASSWORD` | Tài khoản admin | ✅ Bắt buộc |
| `DB_PASS` | MariaDB | ✅ Bắt buộc |
| `GEMINI_API_KEY` | J.A.R.V.I.S Chat, AutoCode | ⚠️ Để bật AI |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot | ⚠️ Tùy chọn |
| `CLOUDFLARE_TUNNEL_TOKEN` | Zero Trust | ⚠️ Tùy chọn |
| Google credentials (`auth/*.json`) | Google Drive/Calendar | ⚠️ Để dùng GG Driver |
| `SENDER_EMAIL`/`SENDER_PASSWORD` | Email SSO | ⚠️ Tùy chọn |

**Cơ chế cảnh báo "chưa cấu hình"**: Backend cung cấp `GET /api/system/config` kiểm tra từng service.
Trang `/documentation` và các tool (J.A.R.V.I.S, AutoCode, GG Driver) tự hiển thị **banner vàng** nếu service liên quan chưa được cấu hình — thay vì lỗi mơ hồ.

---

### Bước 3. Cài đặt Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Tạo file .env (đã có sẵn trong project)
# VITE_API_BASE_URL=         # để trống → dùng Vite proxy
# VITE_WS_BASE_URL=

# Chạy dev server
npm run dev
# Mở trình duyệt: http://localhost:5173
# Vào trang music: http://localhost:5173/music
```

> Vite tự proxy mọi request `/api/*` tới `http://127.0.0.1:16868`
> (đổi qua biến môi trường `VITE_API_PROXY` nếu backend ở chỗ khác).

---

## 🎬 Demo tính năng

Sau khi cài đặt, mở **http://localhost:5173/music**:

1. **Đăng nhập** → nhập tài khoản admin (hoặc chọn "Tiếp tục với tư cách Khách")
2. **Trang chủ**: cuộn xem danh sách bài **Thịnh hành** (ảnh bìa + nút Play nổi) và các **Playlist công khai**
3. **Phát nhạc**: nhấn Play trên một bài → Player ở đáy màn hình xuất hiện, phát nhạc, kéo tua, chỉnh volume
4. **Thả tim**: nhấn biểu tượng trái tim → bài được lưu vào "Bài hát đã thích"
5. **Tìm kiếm**: gõ từ khóa (vd: `Faded`, `tết`) → kết quả tức thì
6. **Lịch sử nghe**: các bài đã phát được ghi lại tự động
7. **Admin** (đăng nhập `admin`): xem thống kê kho nhạc

---

## 🔑 Tài khoản demo

| Loại | Tài khoản | Mật khẩu | Ghi chú |
|------|-----------|----------|---------|
| **Admin** | `admin` | `admin123` | Quyền quản trị, xem trang Admin |
| **Khách** | (nút "Tiếp tục với tư cách Khách") | — | Tự tạo tài khoản khách |

> Người dùng thường có thể **Đăng ký** tài khoản mới trực tiếp trên giao diện.

---

## 🖱️ Cách sử dụng

**Nghe nhạc (D4M Music Pro)**
- Truy cập `/music` → đăng nhập (admin hoặc khách)
- Nhấn Play trên bài hát để phát; dùng player ở đáy để điều khiển (tua, shuffle, repeat, volume)
- Nhấn trái tim để thả tim bài hát
- Vào `/music/search` để tìm bài hát; `/music/library`, `/music/liked`, `/music/history` quản lý thư viện

**Hệ sinh thái**
- Đăng nhập tại `/auth` (dùng chung tài khoản admin)
- Dùng các công cụ tại `/tools/*`, mạng xã hội tại `/social/*`
- Xem thống kê hệ thống tại Dashboard backend

---

## 🗺️ Bảng route truy cập

| URL | Chức năng |
|-----|-----------|
| `/` | Trang chủ Hệ sinh thái |
| `/hub` | Hub trung tâm |
| `/auth` | Đăng nhập / Đăng ký SSO |
| `/music` | 🎵 **D4M Music Pro** (player, thư viện...) |
| `/admin/profile` | Hồ sơ quản trị |
| `/social/social-hub` | Social Hub |
| `/social/numerology` | Numerology |
| `/social/venus` | Venus |
| `/tools/yt-downloader` | YouTube Downloader |
| `/tools/vocal-remove` | Vocal Remover |
| `/tools/jarvis-chat` | Jarvis Chat AI |
| `/tools/download-ggdriver` | Google Drive Commander |
| `/tools/autocode` | AutoCode AI |
| `/documentation` | 📖 Tài liệu hệ thống + trạng thái dịch vụ |

> **API Docs (Swagger)**: `http://localhost:16868/docs` — liệt kê toàn bộ 21 router hệ sinh thái.
> **Trạng thái cấu hình**: `GET /api/system/config` — cho biết service nào đã cấu hình/chưa.

---

## 💰 Donate & Tự động nâng cấp tài khoản (SePay Realtime)

Tính năng donate cho phép người dùng ủng hộ để **tự động kích hoạt tài khoản** theo thời gian thực:

**Luồng hoạt động:**
1. Người dùng mở **DonateModal** (nút "Donate" ở Hub navbar / Sidebar music), nhập số tiền (≥10.000đ)
2. Hệ thống tạo **mã QR tĩnh VietQR** với nội dung chuyển khoản `D4M {user_id}`
3. Frontend mở **WebSocket** tới `/api/ws/donate/{user_id}` và hiện "Đang chờ thanh toán..."
4. Khi người dùng chuyển khoản, **SePay gửi Webhook** tới `/api/donate/sepay-webhook`
5. Backend xác thực token → regex tách `user_id` → `UPDATE users SET active=1` → lưu `donate_logs` → notify WebSocket
6. Frontend nhận `{"status":"success"}` → hiện "Cảm ơn sếp!" + pháo hoa + làm mới user context

**Bảo mật & chống gian lận:**
- Webhook bắt buộc header `Authorization: Bearer <SEPAy_TOKEN>` (sai → 401)
- **Chống replay/fake**: `trans_id` là UNIQUE — giao dịch trùng lặp bị bỏ qua (`ignored`)
- **Mỗi mã QR có hiệu lực 15 phút** (`donate_qr.expires_at`); QR hết hạn → đánh dấu `expired`
- Khi nhận tiền: Toast cảm ơn + **tự fallback trang web sang màn cảm ơn** (hiện số tiền) + pháo hoa + mở khóa dịch vụ + làm mới user context

**Cấu hình (backend/.env):**
```bash
SEPAy_TOKEN=chuoi-bi-mat-cua-ban
BANK_ID=MB              # MB, VCB, TCB, ACB...
BANK_ACCOUNT=0123456789
BANK_ACCOUNT_NAME=LY THUA AN
```
> Bảng `donate_qr` (phiên QR 15 phút) + `donate_logs` (trans_id unique) tự tạo qua `database/donate_table.sql` (đã gộp vào `schema_full.sql`).

**Backend:** `api/donate.py` (QR + webhook), `api/ws_donate.py` (WebSocket realtime).
**Frontend:** `components/donate/DonateModal.jsx`, endpoint trong `config/urls.js` → `DONATE`.

---

## 🎯 Bảng URL tập trung (quan trọng khi muốn đổi đường dẫn)

Toàn bộ URL của dự án được gom vào **2 file duy nhất**. Muốn đổi bất kỳ đường dẫn API nào → **chỉ cần sửa 1 trong 2 file này**, không cần lục tìm trong code.

### Frontend — `frontend/src/config/urls.js`
File này định nghĩa mọi endpoint + URL tài nguyên + URL ngoài:
- `DMUSIC` — API nghe nhạc `/api/dmusic/*`
- `AUDIO` — stream/cover/lyrics `/api/audio/*`
- `AUTH`, `YTDL`, `TOOLS`, `SOCIAL`, `DASHBOARD`, `AI`, `WIDGETS`, `WS`...
- `STATIC`, `SHARE`, `EXTERNAL` — ảnh bìa, avatar, URL chia sẻ, thumbnail...
- `API_BASE_URL` / `WS_BASE_URL` — điểm gốc backend/websocket

> `config/api.js` chỉ là lớp tương thích (ánh xạ sang `urls.js`) để các file cũ không bị hỏng.

### Backend — `backend/core/urls.py`
File này định nghĩa mọi `prefix` + path của toàn bộ router FastAPI:
- `DMUSIC`, `AUDIO`, `MUSIC`, `AUTH`, `YTDL`, `DLDRIVER`, `SOCIAL`, `DASHBOARD`, `AI_ADMIN`, `CHATBOX`, `ASTROLOGY`, `BIO`, `WIDGETS`, `SCRIPTS`, `SECURITY`, `WS`...
- Các router import prefix/path từ đây (vd: `prefix=U.DMUSIC["PREFIX"]`).

**Quy ước đổi đường dẫn:**
```js
// frontend/src/config/urls.js — ví dụ đổi cổng API
export const API_BASE_URL = "http://myserver.com:9000"; // thay vì import.meta.env
```
```python
# backend/core/urls.py — ví dụ đổi prefix music
DMUSIC = { "PREFIX": "/api/music", ... }  # đổi cả frontend DMUSIC + backend DMUSIC cùng lúc
```

---

## 🎨 Design System (giao diện đồng bộ)

Toàn bộ trang ngoài hệ Music dùng chung **design system** để đồng nhất "như đúc":

- **`index.css`** — chứa design tokens + component classes: `.d4m-page`, `.d4m-card`, `.d4m-btn`, `.d4m-input`, `.d4m-label`, `.d4m-badge`, `.d4m-table`, `.d4m-stat`, `.d4m-page-header`, `.d4m-section-title`, `.d4m-grid`, `.d4m-empty`, `.d4m-loading`, `.d4m-error`...
- **`components/common/PageShell.jsx`** — khung trang thống nhất (nền cyber-grid + orb + header tiêu đề gradient + nút back + container). Mọi trang bọc PageShell sẽ tự đồng bộ.
- **Music** là một **ứng dụng con riêng** với CSS riêng (`music.css`) — giữ trải nghiệm player đặc thù (sidebar + bottom player), nhất quán nội bộ.

**Nguyên tắc**: muốn thêm/đồng bộ trang mới → bọc vào `PageShell` và dùng các class `d4m-*` thay vì viết style inline.

## 🐛 Đã fix (Hub / profile / hosted projects)

- ✅ **`sso_service.py` lỗi `NameError: SECRET_KEY`** — dùng `SECRET_KEY` không import → mọi request `profile/me`, `verify_admin` bị 401 "Token hết hạn". Đã sửa thành `settings.SECRET_KEY` (+ import `settings`).
- ✅ **`projects.py` HOSTING_DIR sai** — trỏ `../ubuntu-frontend/hosted_projects` (thư mục cũ) → đổi thành `../frontend/hosted_projects`. Hosted project giờ hiển thị đúng.
- ✅ Sau khi sửa: đăng nhập Hub hiển thị đầy đủ **"TƯ LỆNH | Tên user | Donate"** và danh sách hosted project.

## 🎵 Upload Nhạc Toàn Diện (5-in-1)

Tính năng upload bài hát gồm 5 file (audio, beat, video, ảnh bìa, lời).

**Backend** (`api/songs_upload.py`):
- `GET  /api/admin/songs/check-folder/{folder_name}` — kiểm tra thư mục + file có sẵn + thông tin bài hát từ DB
- `POST /api/admin/songs/upload` — upload 5 file (partial), tự tạo/UPDATE record `songs`, đọc duration bằng mutagen
- Bảo mật: admin-only, SQL parameterized, `safe_join` chống path traversal

**Frontend** (`pages/admin/UploadSongPage.jsx`, route `/admin/upload-song`):
- Slugify folder_name từ title, debounce check-folder
- Banner cảnh báo + danh sách file đã có khi bài tồn tại
- Dialog xác nhận trước khi ghi đè
- Thanh tiến trình upload (axios `onUploadProgress`)

**Test** (`backend/test_songs_upload.py`):
```bash
cd backend && ./venv/bin/python -m pytest test_songs_upload.py -v
```
- `test_upload_create_new_song` — luồng tạo mới (INSERT)
- `test_upload_update_existing_song` — luồng cập nhật (UPDATE partial)
- `test_check_folder_path_traversal_blocked` — chống path traversal

## ✨ Tính năng nâng cao (nhóm 3)

- ✅ **Notification realtime** (`api/notification.py` + `api/ws_donate.py`-style WS):
  - Bảng `notifications`, WS `/api/ws/notify/{user_id}`
  - Endpoint: `POST /push`, `GET /list`, `POST /read`, `POST /read-all`
  - Component `NotificationBell` (chuông + badge + dropdown + WS realtime) đặt trong HubNavbar
- ✅ **Profile công khai** (`api/profile_public.py`): `GET /api/users/{username}` trả hồ sơ + playlist công khai, không cần đăng nhập, cache 60s.
- ✅ **Admin dashboard biểu đồ**: `GET /api/dashboard/music-analytics` — lượt nghe/thích theo 7 ngày + tổng. Hiển thị bar chart trong trang Admin music.
- ✅ **Cache invalidation khi upload**: xóa cache home khi admin upload bài mới.

## ⚡ Hiệu năng (đã tối ưu)

- ✅ **Sửa N+1 query**: `d4m_music.home` & `my_playlists` gộp `COUNT(*)` từ vòng lặp thành **1 query `GROUP BY`**.
- ✅ **Redis cache dữ liệu hot**: module `core/cache.py` (`cache_get`/`cache_set`) — cache response home 60s. Test: lần 1 = 160ms → lần 2 = **28ms** (nhanh ~5.7x). Graceful khi Redis down.
- ✅ **Cache invalidation**: xóa cache home khi toggle-like/interact để data không stale.
- ✅ **Code-split frontend** (Vite/Rolldown `manualChunks`): bundle chính từ **1.47MB → 217KB** (gzip 52KB). Tách vendor-react, vendor-lucide, vendor-radix, vendor-query, vendor-highlight.

## 🔐 Bảo mật & Chất lượng code (đã cải thiện)

Bản gộp đã được kiểm tra & vá các lỗ hổng và tối ưu:

### Backend
- ✅ **Xác thực JWT** cho endpoint cá nhân (`liked`, `history`, `my-playlists`, `toggle-like`) — chặn giả mạo `user_id` query param
- ✅ **Public endpoints** (`home`, `search`, `playlist`) dùng optional auth để hiện trạng thái liked
- ✅ **Connection pool** (thread-safe) thay vì mở/đóng connection mỗi request
- ✅ **Sanitize SQL LIKE** (`%`, `_`) chống wildcard abuse
- ✅ Kiểm tra **email trùng** khi đăng ký
- ✅ **Cache ảnh bìa** tránh `os.path.exists` lặp lại mỗi bài
- ✅ **CORS giới hạn origin** (không dùng `*`)

### Frontend
- ✅ Sửa **bug next/prev stale closure** (dùng refs) khi spam nút
- ✅ Lyrics sync bằng **binary search** O(log n) thay vì O(n²)
- ✅ **Audio error handling** (không treo khi file lỗi)
- ✅ Ghi nhận lượt nghe reset đúng khi đổi bài
- ✅ Đồng bộ endpoint `/api/dmusic/*` giữa frontend & backend
- ✅ **Design System đồng bộ**: toàn bộ trang dùng `d4m-*` classes; inputs → `d4m-input`, buttons → `d4m-btn`, nền thống nhất

### 🛡️ Bảo mật vòng 2 (chống brute-force & path traversal)
- ✅ **Upload validate**: kiểm tra đuôi file theo loại (audio/video/ảnh/lyric), giới hạn kích thước (audio 50MB, video 200MB, ảnh 5MB, lyric 1MB), chống upload file độc hại. File quá lớn → `413`.
- ✅ **Path traversal**: `safe_join()` áp dụng cho stream audio, cover, upload, preview — chặn `../` thoát khỏi thư mục media (→ `400`).
- ✅ **Login lockout**: sai mật khẩu 5 lần → khóa 15 phút (`429`), chống brute-force (admin + SSO).
- ✅ **Forgot-password rate-limit**: tối đa 5 lần gửi OTP/giờ/email (`429`), OTP sai 5 lần → khóa.
- ✅ **OTP brute-force**: `process_sso_verify` + `process_reset_password` giới hạn số lần nhập OTP.
- ✅ **Bổ sung**: `upload.router` đã được đăng ký vào server (trước đó endpoint upload không tồn tại).

### 🛡️ Bảo mật nâng cao (Rate Limit + JWT Blacklist)
- ✅ **Rate Limiting** cho `/api/audio/stream/` bằng Redis — tối đa **50 requests/phút/IP** (chống DDoS & leech băng thông), trả `429` + header `Retry-After`. Module `core/rate_limit.py` (fixed-window, atomic INCR+EXPIRE, fail-open khi Redis down).
- ✅ **JWT Blacklist khi Logout** — mỗi token có `jti`; khi đăng xuất (`POST /api/auth/logout`) token được thêm vào Redis blacklist, vô hiệu hoá ngay lập tức (kể cả token chưa hết hạn). `verify_token`/`decode_token` đều chặn token đã blacklist → `401`.
- ✅ **Test bảo mật** `backend/test_security.py` (pytest + httpx/TestClient):
  - Spam request → assert **HTTP 429**
  - Token đã logout / hết hạn / thiếu → assert **HTTP 401**
  - Chạy: `cd backend && ./venv/bin/python -m pytest test_security.py -v`

---

## 🚀 Triển khai Production

### 🐳 Cách nhanh nhất — Docker Compose (1 lệnh)
Toàn bộ hệ sinh thái (MariaDB + Backend + Frontend) chạy chỉ với:
```bash
docker compose up -d
# MariaDB  : localhost:3306
# Backend  : http://localhost:16868  (docs: /docs)
# Frontend : http://localhost:5173
```
> Docker tự nạp `database/schema_full.sql` (schema hệ sinh thái + music + dữ liệu xã hội) khi DB khởi tạo lần đầu.

### Backend
```bash
cd backend
source venv/bin/activate
# Chạy production bằng Uvicorn/Gunicorn
gunicorn main:app -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:16868
```
> **Bắt buộc** thay đổi mọi secret trong `.env` (SECRET_KEY, ADMIN_PASSWORD, DB_PASS, token Telegram/Google...).

### Frontend
```bash
cd frontend
npm run build        # tạo thư mục dist/
# Deploy dist/ lên Nginx / Vercel / hosting tĩnh
```
Cấu hình Nginx chuyển tiếp `/api/*` về backend:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:16868;
    proxy_set_header Host $host;
}
```

### Gợi ý bảo mật production
- 🔒 Kích hoạt **HTTPS**
- 🔐 Thay đổi toàn bộ mật khẩu / secret
- 🗄️ Backup database định kỳ
- 📦 Dùng CDN cho streaming audio (range request)

---

## 📜 Quyền tác giả

<div align="center">

**D4MDEV — Lý Ân**

</div>

**© 2026 D4MDEV - Lý Ân. Bảo lưu mọi quyền.**

- **Tác giả**: D4MDEV - Lý Ân (Lý Thừa Ân)
- **Dự án**: D4M Music Pro — Nền tảng nghe nhạc trực tuyến & Hệ sinh thái D4M
- **Năm**: 2026
- **Email liên hệ**: lythuaan5555@gmail.com

---

### 📌 Giấy phép sử dụng

Dự án này được phát triển và sở hữu bởi **D4MDEV - Lý Ân**. Mọi hành vi:

- ✔️ Sử dụng cho mục đích học tập, nghiên cứu
- ✔️ Sao chép, chỉnh sửa **có ghi rõ nguồn gốc tác giả**
- ❌ **Không** được thương mại hóa trái phép
- ❌ **Không** được xóa bỏ thông tin bản quyền

> ⚠️ **Lưu ý pháp lý**: Các bài hát trong dữ liệu mẫu chỉ dùng cho **mục đích demo**. Khi triển khai thực tế, hãy đảm bảo bạn có đầy đủ **quyền sử dụng và bản quyền** đối với nội dung âm nhạc.

---

*Cảm ơn bạn đã sử dụng sản phẩm của D4MDEV - Lý Ân!* 🎧
