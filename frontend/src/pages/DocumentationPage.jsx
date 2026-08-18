import React, { useEffect, useState } from "react";
import PageShell from "../components/common/PageShell";
import { SYSTEM } from "../config/urls";

/**
 * Trang /documentation — tài liệu hệ thống D4M Ecosystem.
 * Hiển thị trạng thái các dịch vụ đã cấu hình hay chưa (từ SYSTEM.CONFIG).
 */
export default function DocumentationPage() {
  const [config, setConfig] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(SYSTEM.CONFIG)
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setErr(true));
  }, []);

  const serviceStatus = (cfg, key) => {
    if (!cfg) return "không rõ";
    const v = cfg?.[key];
    return v ? "✅ đã cấu hình" : "❌ chưa cấu hình";
  };

  const routes = [
    ["/music", "🎵 D4M Music Pro — nghe nhạc, thư viện"],
    ["/tools/yt-downloader", "📺 YouTube Downloader"],
    ["/tools/vocal-remove", "🎤 Vocal Remover (tách nhạc)"],
    ["/tools/jarvis-chat", "🤖 J.A.R.V.I.S AI Chat"],
    ["/tools/download-ggdriver", "📁 Google Drive Commander"],
    ["/tools/autocode", "🧠 AutoCode AI"],
    ["/social/social-hub", "🌐 Social Hub"],
    ["/social/numerology", "🔮 Thần Số Học"],
    ["/social/venus", "❤️ Love Sync (Venus)"],
    ["/admin/profile", "👤 Hồ sơ quản trị"],
    ["/auth", "🔐 Đăng nhập / Đăng ký SSO"],
  ];

  return (
    <PageShell
      title="Tài liệu hệ thống D4M"
      subtitle="Tổng quan kiến trúc, dịch vụ, API và hướng dẫn cấu hình hệ sinh thái"
      icon="fa-solid fa-book-journal-whills"
      maxWidth={960}
    >
      {/* Trạng thái dịch vụ */}
      <section>
        <h2 className="d4m-section-title">Trạng thái dịch vụ</h2>
        {/* min-height ổn định giữa trạng thái tải và đã tải — tránh layout shift (CLS) */}
        <div style={{ minHeight: 140 }}>
        {err ? (
          <div className="d4m-error">Không kết nối được backend để kiểm tra cấu hình.</div>
        ) : !config ? (
          <div className="d4m-loading" style={{ padding: "2rem" }}><div className="d4m-spinner" /><span>Đang tải...</span></div>
        ) : (
          <div className="d4m-card">
            <table className="d4m-table">
              <thead>
                <tr><th>Dịch vụ</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {config.services?.map((s) => (
                  <tr key={s.key}>
                    <td>{s.name}</td>
                    <td>{serviceStatus(config, s.key)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>

      {/* Kiến trúc */}
      <section>
        <h2 className="d4m-section-title">Kiến trúc</h2>
        <div className="d4m-grid d4m-grid-2">
          <div className="d4m-card">
            <h3 className="font-heading font-bold mb-2">🎨 Frontend</h3>
            <p className="text-sm" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
              React 19 + Vite 8 + Tailwind CSS v4. Routing toàn bộ hệ sinh thái tại <code>src/App.jsx</code>.
            </p>
          </div>
          <div className="d4m-card">
            <h3 className="font-heading font-bold mb-2">🔧 Backend</h3>
            <p className="text-sm" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
              FastAPI. 25+ module API. Entry: <code>backend/main.py</code> (port 16868).
            </p>
          </div>
          <div className="d4m-card">
            <h3 className="font-heading font-bold mb-2">🗄️ Database</h3>
            <p className="text-sm" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
              MariaDB. DB mặc định <code>social_hub</code>, 26 bảng (users, songs, playlists, posts...).
            </p>
          </div>
          <div className="d4m-card">
            <h3 className="font-heading font-bold mb-2">🎯 URL tập trung</h3>
            <p className="text-sm" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
              Frontend: <code>src/config/urls.js</code> — Backend: <code>backend/core/urls.py</code>.
            </p>
          </div>
        </div>
      </section>

      {/* Danh sách tính năng */}
      <section>
        <h2 className="d4m-section-title">Các tính năng & URL</h2>
        <div className="d4m-card">
          <table className="d4m-table">
            <thead><tr><th>URL</th><th>Chức năng</th></tr></thead>
            <tbody>
              {routes.map(([url, desc]) => (
                <tr key={url}><td><code>{url}</code></td><td>{desc}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API docs */}
      <section>
        <h2 className="d4m-section-title">API Docs (Swagger)</h2>
        <div className="d4m-card">
          <p className="text-sm" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
            Backend cung cấp giao diện tài liệu API tương tác tại{" "}
            <a href={SYSTEM.DOCS} style={{ color: "var(--d4m-primary)", fontWeight: 600 }} target="_blank" rel="noopener noreferrer">
              {SYSTEM.DOCS}
            </a>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
