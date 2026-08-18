import { useEffect } from "react";

/**
 * SEO — component thuần (useEffect) để cập nhật <title> và <meta name="description">
 * linh hoạt theo từng trang. Không cần thêm dependency nặng (react-helmet-async),
 * giữ bundle nhẹ và tránh render thừa.
 *
 * Cách dùng: <SEO title="Tên Nghệ Sĩ - D4M Music Pro" description="Nghe nhạc ..." />
 */
export default function SEO({ title, description }) {
  useEffect(() => {
    const APP_NAME = "D4M Music Pro";

    // 1) Title — ưu tiên title tuỳ trang, fallback về tên app
    const fullTitle = title ? `${title} - ${APP_NAME}` : APP_NAME;
    document.title = fullTitle;

    // 2) Meta description — update hoặc tạo nếu chưa có
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const DEFAULT_DESC =
      "D4M Music Pro — Nền tảng nghe nhạc & Hệ sinh thái công nghệ D4M: trình phát nhạc, tải nhạc, social hub và bộ công cụ AI.";
    meta.content = description || DEFAULT_DESC;

    // 3) Open Graph cơ bản cho tính năng chia sẻ link (SEO social)
    const setMeta = (attr, key, content) => {
      let m = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute(attr, key);
        document.head.appendChild(m);
      }
      m.content = content;
    };
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", meta.content);
    setMeta("name", "theme-color", "#000000");

    // Không cần cleanup — các trang sau sẽ ghi đè giá trị mới.
  }, [title, description]);

  return null;
}
