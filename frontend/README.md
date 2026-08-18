# 🎨 D4M Frontend — React + Vite (Hệ sinh thái D4M)

> **Frontend** của hệ sinh thái **D4M** — giao diện người dùng cho toàn bộ dịch vụ
> (Music Pro, Social, Tools, Auth/SSO, Dashboard, Documentation...).

---

## 🚀 Giới thiệu

`ubuntu-d4m/frontend` là **giao diện web** của hệ sinh thái D4M, xây bằng **React 19 + Vite + Tailwind CSS v4**.
Nó kết nối tới backend D4M (FastAPI) qua proxy `/api` và hiển thị toàn bộ tính năng:
nghe nhạc, mạng xã hội, công cụ tải/đổi, AI, quản trị...

| Thành phần | Giá trị |
|-----------|---------|
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Routing | React Router 7 |
| Data fetching | TanStack Query + fetch |
| State | Context API |
| Toast | Sonner (thống nhất toàn app) |

---

## 🧩 Cấu trúc thư mục

```
frontend/
├── index.html             # HTML entry
├── vite.config.js         # ⚙️ Cấu hình Vite + proxy /api → backend
├── nginx.conf             # Cấu hình Nginx (Docker)
├── Dockerfile             # Multi-stage build (React → Nginx)
├── .env                   # VITE_API_BASE_URL / VITE_WS_BASE_URL
│
└── src/
    ├── main.jsx           # ⭐ Entry React (mount root)
    ├── App.jsx            # ⭐ Routing toàn bộ hệ sinh thái + Toaster toàn cục
    ├── index.css          # 🎨 Design system (d4m-*) + Tailwind + effects
    │
    ├── config/
    │   ├── urls.js        # 🎯 BẢNG URL TẬP TRUNG (mọi endpoint) — sửa URL ở đây
    │   └── api.js         # Lớp tương thích ENDPOINTS (ánh xạ sang urls.js)
    │
    ├── api/
    │   └── client.js      # API client (fetch + token + timeout) + authApi
    │
    ├── lib/
    │   ├── toast.js       # 🍞 showToast() thống nhất toàn app
    │   └── format.js      # Hàm định dạng (thời gian, số lượt)
    │
    ├── services/
    │   └── api.js         # axios instance (hệ sinh thái)
    │
    ├── components/
    │   ├── common/        # PageShell, ConfigWarning, Footer, Reveal
    │   ├── donate/        # 💰 DonateModal (QR + WebSocket realtime)
    │   ├── home/          # HomeNavbar...
    │   ├── hub/           # HubNavbar, CoreProjects, UserProjects
    │   └── music/         # Music app con (contexts, Layout, BottomPlayer, ui, music.css)
    │
    └── pages/             # 📄 CÁC TRANG
        ├── HomePage.jsx       # Trang chủ hệ sinh thái
        ├── HubPage.jsx        # Cloud Workspace Hub
        ├── AuthPage.jsx       # Đăng nhập / Đăng ký SSO
        ├── DocumentationPage.jsx  # 📖 Tài liệu hệ thống
        ├── admin/ProfilePage.jsx   # Hồ sơ quản trị
        ├── music/D4MusicPlayer.jsx # 🎵 Music Pro (app con)
        ├── social/             # SocialHub, Numerology, Venus
        └── tools/              # YtDownloader, VocalRemove, JarvisChat, GgDrive, AutoCode
```

---

## 🗺️ Bảng route

| URL | Chức năng |
|-----|-----------|
| `/` | Trang chủ Hệ sinh thái |
| `/hub` | Hub trung tâm (Cloud Workspace) |
| `/auth` | Đăng nhập / Đăng ký SSO |
| `/music/*` | 🎵 D4M Music Pro (player, thư viện) |
| `/admin/profile` | Hồ sơ quản trị |
| `/social/social-hub` | Social Hub |
| `/social/numerology` | Thần Số Học |
| `/social/venus` | Venus Sync |
| `/tools/yt-downloader` | YouTube Downloader |
| `/tools/vocal-remove` | Vocal Remover |
| `/tools/jarvis-chat` | J.A.R.V.I.S Chat AI |
| `/tools/download-ggdriver` | Google Drive Commander |
| `/tools/autocode` | AutoCode AI |
| `/documentation` | 📖 Tài liệu hệ thống |

---

## 🎨 Design System (đồng bộ "như đúc")

Toàn bộ trang ngoài Music dùng chung design system để nhất quán:

- **`index.css`** — design tokens + classes: `.d4m-page`, `.d4m-card`, `.d4m-btn`, `.d4m-input`, `.d4m-label`, `.d4m-badge`, `.d4m-table`, `.d4m-stat`, `.d4m-page-header`, `.d4m-section-title`, `.d4m-grid`, `.d4m-empty`, `.d4m-loading`, `.d4m-error`
- **`components/common/PageShell.jsx`** — khung trang thống nhất (nền cyber-grid + orb + header gradient + nút back + container)
- **Music** là **ứng dụng con riêng** với CSS riêng (`music.css`) — giữ trải nghiệm player đặc thù.

> **Nguyên tắc**: trang mới → bọc vào `PageShell` + dùng class `d4m-*` thay vì style inline.

---

## 🎯 URL tập trung (quan trọng)

Mọi URL/endpoint nằm trong **1 file duy nhất**: `src/config/urls.js`

```js
// Đổi cổng API backend chỉ bằng 1 dòng:
export const API_BASE_URL = "http://myserver.com:16868";
```

- `DMUSIC` — API Music
- `AUDIO` — stream/cover/lyrics
- `DONATE` — donate QR + WebSocket realtime
- `AUTH`, `YTDL`, `TOOLS`, `SOCIAL`, `DASHBOARD`, `AI`, `WS`...
- `STATIC`, `SHARE`, `EXTERNAL` — tài nguyên
- `config/api.js` chỉ là lớp tương thích (ánh xạ sang urls.js)

---

## 🚀 Cách chạy

### 0. Yêu cầu
- Node.js 18+ (khuyến nghị 20+)

### 1. Cài dependencies
```bash
npm install
```

### 2. Cấu hình .env
```bash
# đã có sẵn, để trống để dùng Vite proxy
VITE_API_BASE_URL=
VITE_WS_BASE_URL=
```

### 3. Chạy dev
```bash
npm run dev
# Mở http://localhost:5173
```
> Vite tự proxy `/api/*` → `http://127.0.0.1:16868` (backend). Đổi qua `VITE_API_PROXY` nếu cần.

### 4. Build production
```bash
npm run build   # tạo thư mục dist/
npm run preview # xem bản build
```

---

## 🍞 Toast thống nhất

Mọi trang dùng **một hệ thống toast** (Sonner):
```js
import { showToast } from "../../lib/toast";
showToast("Đã lưu!");                       // success
showToast("Có lỗi!", "error");              // error
showToast("Thông tin", "info");
showToast("Đang tải...", "loading");
```
`<Toaster>` được mount toàn cục ở `App.jsx`.

---

## 🐳 Docker

Frontend có `Dockerfile` (multi-stage) + `nginx.conf` (proxy `/api` → backend).
Chạy cùng toàn bộ hệ sinh thái:
```bash
cd .. && docker compose up -d   # frontend tại http://localhost:5173
```

---

## 📜 Tác giả

**D4MDEV - Lý Ân** — © 2026. Frontend của hệ sinh thái D4M.
