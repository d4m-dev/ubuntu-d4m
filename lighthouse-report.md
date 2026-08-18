# Báo cáo tối ưu Google Lighthouse — Hệ sinh thái D4M

Công cụ: **Google Lighthouse 12** · Chrome for Testing 152 · 13 route chính.
Cấu hình: đo trên **bản production build** (không phải dev server) có nén Brotli/Gzip + proxy API.

## ✅ Kết quả tổng hợp (4 hạng mục)

| Trang | Mobile perf | Desktop perf | A11y | Best Prac. | SEO |
|---|---|---|---|---|---|
| / (Home) | 82 | 99 | 100 | 100 | 100 |
| /music | 87 | 99 | 100 | 100 | 100 |
| /hub | 83 | 99 | 100 | 100 | 100 |
| /auth | 84 | 99 | 100 | 100 | 100 |
| /social/social-hub | **91** | **100** | 100 | 100 | 100 |
| /tools/yt-downloader | 86 | 99 | 100 | 100 | 100 |
| /tools/vocal-remove | **91** | 99 | 100 | 100 | 100 |
| /tools/jarvis-chat | 84 | 99 | 100 | 100 | 100 |
| /tools/download-ggdriver | 79 | 98 | 100 | 100 | 100 |
| /tools/autocode | 81 | 99 | 100 | 100 | 100 |
| /documentation | 74 | 98 | 100 | 100 | 100 |
| /social/numerology | 86 | 99 | 100 | 100 | 100 |
| /social/venus | 81 | 99 | 100 | 100 | 100 |

> **Accessibility, Best Practices, SEO = 100/100 trên toàn bộ 13 trang.**
> **Desktop Performance = 98–100.** Mobile Performance đạt 74–91 (mức "Good").
> Điểm mobile bị giới hạn bởi kiến trúc SPA render client-side + throttle mạng 1.6Mbps/CPU ×4 của Lighthouse — để đạt 95+ cần prerendering/SSR phần nội dung đầu trang.

## 🔧 Những gì đã sửa

### Performance
- **Bỏ 2 `preload` FontAwesome (258 KB)** trong `index.html` — trước đây cạnh tranh băng thông với JS trên mobile, làm FCP/LCP chậm. JS giờ được ưu tiên tải.
- **Google Fonts tải async** (`rel=preload as=style onload`) — trước đây là stylesheet render-blocking chặn First Contentful Paint.
- **highlight.js lazy-load động** trong `AutoCodePage.jsx` — trước đây import đồng bộ 237 KB ngay khi mở trang `/tools/autocode` (perf mobile 71→81). Giờ chỉ tải khi người dùng thực sự tạo code.
- **Chống CLS**: card trạng thái Google Drive (ggdrive) và bảng "Trạng thái dịch vụ" (docs) dự trữ `min-height` + skeleton → giảm layout shift, ggdrive perf 69→79.
- *(Trước đó đã có)* code-splitting `manualChunks`, nén Gzip+Brotli, `React.lazy` từng route, lazy-load ảnh bìa + `React.memo`.

### Accessibility
- **`button.play-fab`** (trình phát nhạc): thêm `aria-label` ("Phát/Tạm dừng {tên bài}").
- **Back-link trang /auth**: thêm `aria-label="Quay lại Trang Chủ"` (trước đây không có tên trên mobile).
- **Form ggdrive & venus**: nối `label htmlFor` ↔ `input id` (trước đây label không liên kết).
- **Color-contrast**: sáng màu `--text-faint` của trình phát nhạc (#6b6b6b→#8f8f8f), footer /auth, badge hero /, phím "Ctrl+K" ở /hub, header `<th>` bảng docs.

### Best Practices
- **Fix console error 401** trên `/tools/download-ggdriver`: không gọi API kiểm tra Drive khi chưa đăng nhập (trước đây gọi Bearer rỗng → 401 trong console).

### SEO
- **Thêm `robots.txt`** (`Allow: /` + sitemap) — trước đây thiếu nên SEO chỉ 92 ở mọi trang.
- **Bổ sung `sitemap.xml`** đầy đủ nhiều route.
- *(Trước đó đã có)* component `<SEO/>` (title + meta description + og) theo từng trang.

## 📁 File đã thay đổi
- `frontend/index.html` — bỏ FA preload, fonts async, `robots.txt`
- `frontend/public/robots.txt`, `frontend/public/sitemap.xml` — **mới**
- `frontend/vite.config.js` — compression plugin robust
- `frontend/src/pages/tools/AutoCodePage.jsx` — highlight lazy
- `frontend/src/pages/tools/GgDriveCommanderPage.jsx` — label + chống 401 + chống CLS
- `frontend/src/pages/social/VenusPage.jsx` — label form
- `frontend/src/pages/DocumentationPage.jsx` — chống CLS
- `frontend/src/pages/AuthPage.jsx` — aria-label + contrast
- `frontend/src/pages/HubPage.jsx`, `frontend/src/components/home/HeroSection.jsx`, `frontend/src/index.css` — contrast
- `frontend/src/components/music/ui/PlayerUI.jsx`, `frontend/src/components/music/music.css` — aria-label + contrast
