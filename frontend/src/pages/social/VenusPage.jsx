// src/pages/social/VenusPage.jsx
import React, { useState } from "react";
import { ENDPOINTS } from "../../config/api";
import { showToast } from "../../lib/toast";
import PageShell from "../../components/common/PageShell";

export default function VenusPage() {
  const [formData, setFormData] = useState({
    name1: "Nguyễn Văn A",
    dob1: "2000-01-01",
    name2: "",
    dob2: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCalculateLove = async () => {
    if (!formData.dob1 || !formData.dob2) {
      showToast("Vui lòng chọn ngày sinh cho cả hai người!", "error");
      return;
    }
    if (!formData.name1.trim() || !formData.name2.trim()) {
      showToast("Vui lòng nhập tên cả hai người!", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(ENDPOINTS.ASTROLOGY.MATCH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_1: { name: formData.name1, birth_date: formData.dob1 },
          person_2: { name: formData.name2, birth_date: formData.dob2 }
        })
      });
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setResult(data.data || data);
        showToast("Giải mã năng lượng thành công!");
      } else {
        showToast(data.detail || "Có lỗi khi giải mã!", "error");
      }
    } catch {
      showToast("Không thể kết nối đến máy chủ!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Venus Sync"
      subtitle="Nội suy số chủ đạo & năng lượng chòm sao giữa hai người"
      icon="fa-solid fa-heart"
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="d4m-card">
          {/* Form hai cột */}
          <div className="d4m-grid d4m-grid-2">
            <div>
              <div className="d4m-badge" style={{ background: "rgba(244,63,94,.12)", borderColor: "rgba(244,63,94,.3)", color: "#fda4af", marginBottom: "1rem" }}>
                Năng lượng A
              </div>
              <div className="d4m-field">
                <label className="d4m-label" htmlFor="venus-name1">Họ và tên</label>
                <input
                  id="venus-name1"
                  type="text"
                  value={formData.name1}
                  onChange={(e) => setFormData({ ...formData, name1: e.target.value })}
                  className="d4m-input"
                />
              </div>
              <div className="d4m-field">
                <label className="d4m-label" htmlFor="venus-dob1">Ngày sinh</label>
                <input
                  id="venus-dob1"
                  type="date"
                  value={formData.dob1}
                  onChange={(e) => setFormData({ ...formData, dob1: e.target.value })}
                  className="d4m-input"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>

            <div>
              <div className="d4m-badge" style={{ background: "rgba(59,130,246,.12)", borderColor: "rgba(59,130,246,.3)", color: "#93c5fd", marginBottom: "1rem" }}>
                Năng lượng B
              </div>
              <div className="d4m-field">
                <label className="d4m-label" htmlFor="venus-name2">Họ và tên</label>
                <input
                  id="venus-name2"
                  type="text"
                  value={formData.name2}
                  placeholder="Nhập tên đối phương"
                  onChange={(e) => setFormData({ ...formData, name2: e.target.value })}
                  className="d4m-input"
                />
              </div>
              <div className="d4m-field">
                <label className="d4m-label" htmlFor="venus-dob2">Ngày sinh</label>
                <input
                  id="venus-dob2"
                  type="date"
                  value={formData.dob2}
                  onChange={(e) => setFormData({ ...formData, dob2: e.target.value })}
                  className="d4m-input"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
          </div>

          {/* Nút submit */}
          <button
            onClick={handleCalculateLove}
            disabled={loading}
            className="d4m-btn d4m-btn-primary w-full mt-6"
            style={{ width: "100%", padding: ".85rem", background: "linear-gradient(135deg,#e11d48,#f97316)" }}
          >
            {loading ? (
              <><i className="fa-solid fa-circle-notch fa-spin" /><span>Đang kết nối...</span></>
            ) : (
              <><i className="fa-solid fa-wand-magic-sparkles" /><span>Giải mã tương hợp</span></>
            )}
          </button>

          {/* Kết quả */}
          {result && (
            <div className="d4m-card mt-6" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "4rem",
                  fontWeight: 900,
                  background: "linear-gradient(135deg,#f43f5e,#fb923c)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {result.score}%
              </div>
              <div className="d4m-grid d4m-grid-2 mt-4" style={{ gap: ".75rem", maxWidth: 480, margin: "1rem auto 0" }}>
                <div className="d4m-card" style={{ padding: ".75rem", fontSize: ".85rem" }}>
                  Năng lượng A: <span style={{ color: "#fda4af", fontWeight: 700 }}>{result.person_1?.venus || "?"}</span>
                </div>
                <div className="d4m-card" style={{ padding: ".75rem", fontSize: ".85rem" }}>
                  Năng lượng B: <span style={{ color: "#93c5fd", fontWeight: 700 }}>{result.person_2?.venus || "?"}</span>
                </div>
              </div>
              <p className="mt-4" style={{ color: "var(--d4m-text-dim)", fontStyle: "italic", lineHeight: 1.6, fontSize: ".9rem" }}>
                "{result.message}"
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
