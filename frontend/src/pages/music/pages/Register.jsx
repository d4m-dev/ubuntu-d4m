import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await register({ username, password, full_name, email });
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1200px 600px at 50% -10%, #14371f 0%, #0a0a0a 55%)", padding: "20px" }}>
      <form onSubmit={onSubmit} style={{ width: 400, background: "#121212", border: "1px solid var(--border)", borderRadius: 14, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1ed760,#0a4d2b)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎧</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Đăng ký tài khoản</h1>
          <p className="hint">Tham gia D4M Music Pro</p>
        </div>

        <Field label="Tên đăng nhập *" value={username} onChange={setUsername} ph="d4m_user" required />
        <Field label="Họ tên" value={full_name} onChange={setFullName} ph="Tên của bạn" />
        <Field label="Email" value={email} onChange={setEmail} ph="you@email.com" type="email" />
        <Field label="Mật khẩu *" value={password} onChange={setPassword} ph="••••••••" type="password" required />
        <Field label="Xác nhận mật khẩu *" value={confirm} onChange={setConfirm} ph="••••••••" type="password" required />

        <button type="submit" disabled={busy} style={{ ...btnPrimary, margin: "6px 0 18px" }}>
          {busy ? "Đang xử lý..." : "Tạo tài khoản"}
        </button>

        <p className="hint" style={{ textAlign: "center" }}>
          Đã có tài khoản? <Link to="/login" style={{ color: "var(--accent)" }}>Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, ph, type = "text", required = false }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="hint">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        required={required}
        autoComplete={type === "password" ? "new-password" : "off"}
        style={inputStyle}
      />
    </>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid var(--border)",
  background: "#242424", color: "#fff", fontSize: 14, outline: "none", marginBottom: 14,
};
const btnPrimary = {
  width: "100%", padding: "12px", borderRadius: 30, border: "none", background: "var(--accent)",
  color: "#000", fontWeight: 700, fontSize: 15,
};
