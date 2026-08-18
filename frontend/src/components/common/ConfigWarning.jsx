import React, { useEffect, useState } from "react";
import { SYSTEM } from "../../config/urls";

/**
 * ConfigWarning — Banner cảnh báo khi một dịch vụ ngoài chưa được cấu hình.
 * Dùng trong các trang phụ thuộc API bên ngoài (Gemini, Google Drive, Telegram...).
 *
 * Props:
 *   - serviceKey: "gemini" | "telegram" | "cloudflare" | "db" | "jwt"
 *   - message:    chuỗi hướng dẫn hiển thị khi chưa cấu hình
 */
export default function ConfigWarning({ serviceKey, message }) {
  const [configured, setConfigured] = useState(true); // mặc định ẩn (tránh nhấp nháy)
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch(SYSTEM.CONFIG)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.services) {
          const s = d.services.find((x) => x.key === serviceKey);
          if (s) setConfigured(s.configured);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true)); // nếu lỗi, bỏ qua (không chặn trang)
  }, [serviceKey]);

  if (!checked || configured) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "rgba(240,180,41,.12)",
        border: "1px solid rgba(240,180,41,.4)",
        color: "#f0c96b",
        padding: "12px 16px",
        borderRadius: 10,
        margin: "12px 0",
        fontSize: 13.5,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
      <div>
        <strong>Dịch vụ này chưa được cấu hình.</strong>
        <div style={{ marginTop: 4 }}>{message}</div>
      </div>
    </div>
  );
}
