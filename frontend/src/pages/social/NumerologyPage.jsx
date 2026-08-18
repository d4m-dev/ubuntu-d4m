// src/pages/social/NumerologyPage.jsx
import React, { useState } from "react";
import { ENDPOINTS } from "../../config/api";
import { showToast } from "../../lib/toast";
import PageShell from "../../components/common/PageShell";

export default function NumerologyPage() {
  const [formData, setFormData] = useState({ fullName: "", birthDate: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/\d{4}$/;
    if (!dateRegex.test(formData.birthDate)) {
      showToast("Vui lòng nhập đúng định dạng DD/MM/YYYY!", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(ENDPOINTS.BIO.CALCULATE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.fullName,
          birth_date: formData.birthDate
        })
      });
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setResult(data.data);
        fetch(ENDPOINTS.BIO.TRACK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link_id: "numerology_search", platform: "Web Application React" })
        }).catch(() => {});
      } else {
        showToast(data.detail || "Có lỗi xảy ra trong quá trình giải mã!", "error");
      }
    } catch {
      showToast("Không thể kết nối đến Máy chủ Ubuntu Core!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Thần Số Học"
      subtitle="Khám phá con số chủ đạo và vận mệnh đường đời của bạn"
      icon="fa-solid fa-star-and-crescent"
    >
      <div style={{ maxWidth: 460, margin: "0 auto" }}>
        <div className="d4m-card">
          <form onSubmit={handleSubmit}>
            <div className="d4m-field">
              <label className="d4m-label">Họ và Tên</label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn A"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="d4m-input"
              />
            </div>
            <div className="d4m-field">
              <label className="d4m-label">Ngày Tháng Năm Sinh</label>
              <input
                type="text"
                required
                placeholder="VD: 01/01/2000"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="d4m-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="d4m-btn d4m-btn-primary w-full"
              style={{ width: "100%", padding: ".8rem" }}
            >
              {loading ? (
                <>
                  <span>Đang tính toán...</span>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                </>
              ) : (
                <span>Giải mã ngay</span>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-8" style={{ borderTop: "1px solid var(--d4m-border)", paddingTop: "1.5rem", textAlign: "center" }}>
              <p className="d4m-label" style={{ textTransform: "none" }}>Số Chủ Đạo Của Bạn Là</p>
              <div
                style={{
                  fontSize: "4.5rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg,#34d399,#06b6d4)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  margin: ".5rem 0",
                }}
              >
                {result.life_path_number}
              </div>
              <h2 className="d4m-section-title" style={{ justifyContent: "center", marginTop: ".5rem" }}>
                {result.traits.title}
              </h2>
              <p style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6, fontSize: ".9rem" }}>
                {result.traits.desc}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
