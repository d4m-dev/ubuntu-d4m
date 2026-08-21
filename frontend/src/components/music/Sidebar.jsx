import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon, SearchIcon, LibraryIcon, HeartIcon, MusicIcon, LogoutIcon, ClockIcon,
} from "./ui/Icons";
import { useAuth } from "./contexts/AuthContext";
import DonateModal from "../donate/DonateModal";

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const [showDonate, setShowDonate] = useState(false);

  const link = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">🎧</div>
        <div>
          <b>D4M Music</b>
          <small>PRO</small>
        </div>
      </div>

      <NavLink to="/music" end className={link}>
        <HomeIcon /> Trang chủ
      </NavLink>
      <NavLink to="/music/search" className={link}>
        <SearchIcon /> Tìm kiếm
      </NavLink>
      <NavLink to="/music/library" className={link}>
        <LibraryIcon /> Thư viện
      </NavLink>

      <div className="section-title">THƯ MỤC CỦA BẠN</div>
      <NavLink to="/music/liked" className={link}>
        <HeartIcon filled /> Bài hát đã thích
      </NavLink>
      <NavLink to="/music/history" className={link}>
        <ClockIcon /> Lịch sử nghe
      </NavLink>

      {isAdmin && (
        <>
          <div className="section-title">QUẢN TRỊ</div>
          <NavLink to="/music/admin" className={link}>
            <MusicIcon /> Quản lý nhạc
          </NavLink>
        </>
      )}

      <div style={{ flex: 1 }} />
      {user ? (
        <>
          <button
            className="nav-link"
            onClick={() => setShowDonate(true)}
            style={{ color: "var(--accent)" }}
          >
            💚 Donate & Kích hoạt
          </button>
          <button className="nav-link" onClick={logout} style={{ color: "var(--text-dim)" }}>
            <LogoutIcon /> Đăng xuất
          </button>
        </>
      ) : null}

      <DonateModal open={showDonate} onClose={() => setShowDonate(false)} />
    </aside>
  );
}
