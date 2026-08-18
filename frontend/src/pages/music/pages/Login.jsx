import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login, guest } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onGuest = async () => {
    setBusy(true);
    try {
      await guest();
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1200px 600px at 50% -10%, #14371f 0%, #0a0a0a 55%)" }}>
      <form onSubmit={onSubmit} style={{ width: 360, background: "#121212", border: "1px solid var(--border)", borderRadius: 14, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#1ed760,#0a4d2b)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🎧</div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Đăng nhập D4M Music</h1>
          <p className="hint">Chào mừng bạn quay trở lại</p>
        </div>

        <label htmlFor="d4m-login-user" className="hint">Tên đăng nhập</label>
        <input
          id="d4m-login-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="admin"
          style={{ ...inputStyle, marginBottom: 14 }}
          autoComplete="username"
          required
        />
        <label htmlFor="d4m-login-pass" className="hint">Mật khẩu</label>
        <input
          id="d4m-login-pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ ...inputStyle, marginBottom: 20 }}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={busy} style={{ ...btnPrimary, marginBottom: 10 }}>
          {busy ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <button type="button" onClick={onGuest} disabled={busy} style={{ ...btnGhost, marginBottom: 18 }}>
          Tiếp tục với tư cách Khách
        </button>

        <p className="hint" style={{ textAlign: "center" }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: "var(--accent)" }}>Đăng ký ngay</Link>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid var(--border)",
  background: "#242424", color: "#fff", fontSize: 14, outline: "none",
};
const btnPrimary = {
  width: "100%", padding: "12px", borderRadius: 30, border: "none", background: "var(--accent)",
  color: "#000", fontWeight: 700, fontSize: 15,
};
const btnGhost = {
  width: "100%", padding: "12px", borderRadius: 30, border: "1px solid var(--border)",
  background: "transparent", color: "#fff", fontWeight: 600, fontSize: 14,
};
