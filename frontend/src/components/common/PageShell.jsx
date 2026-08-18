import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * PageShell — Khung giao diện thống nhất cho mọi trang ngoài hệ Music.
 * Cung cấp nền (cyber-grid + orb), container, header tiêu đề, footer.
 * Mọi trang bọc trong PageShell sẽ đồng bộ "như đúc".
 *
 * Props:
 *   - title     : Tiêu đề trang (hiển thị gradient)
 *   - subtitle  : Mô tả phụ
 *   - icon      : Icon (className fa)
 *   - children  : Nội dung trang
 *   - back      : hiển thị nút quay lại (default true)
 *   - actions   : node tuỳ chọn hiển thị bên phải header
 *   - maxWidth  : max-width container (default 1200)
 */
export default function PageShell({
  title,
  subtitle,
  icon,
  children,
  back = true,
  actions,
  maxWidth = 1200,
}) {
  const navigate = useNavigate();

  return (
    <div className="d4m-page">
      {/* Background effects */}
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />

      <div className="d4m-container" style={{ maxWidth }}>
        {title && (
          <div className="d4m-page-header">
            {back && (
              <button
                className="d4m-back"
                onClick={() => navigate(-1)}
                aria-label="Quay lại"
                title="Quay lại"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
            )}
            <div style={{ flex: 1 }}>
              <h1 className="d4m-page-title">
                {icon && <i className={`${icon} mr-2 opacity-80`} aria-hidden="true" />}
                {title}
              </h1>
              {subtitle && <p className="d4m-page-subtitle">{subtitle}</p>}
            </div>
            {actions}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
