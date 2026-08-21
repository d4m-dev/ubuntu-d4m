import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SearchIcon } from "./Icons";
import { useAuth } from "../contexts/AuthContext";
import { STATIC } from "../../../config/urls";

export default function TopBar({ defaultQuery = "" }) {
  const [q, setQ] = useState(defaultQuery);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/music/search?q=${encodeURIComponent(q.trim())}` : "/music/search");
  };

  return (
    <div className="topbar">
      <form className="search-box" onSubmit={submit} style={{ display: "flex" }}>
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm bài hát, nghệ sĩ..."
        />
      </form>
      <div style={{ flex: 1 }} />
      {user ? (
        <Link to={isAdmin ? "/admin" : "/library"} className="user-chip">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" />
          ) : (
            <img src={STATIC.avatar(user.username)} alt="" />
          )}
          <span>{user.full_name || user.username}</span>
          {isAdmin && <span className="badge-admin">ADMIN</span>}
        </Link>
      ) : (
        <Link to="/music/login" className="user-chip">
          <span>Đăng nhập</span>
        </Link>
      )}
    </div>
  );
}
