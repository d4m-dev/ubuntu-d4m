import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { PlaylistCard, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";

export default function Library() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-playlists", user?.id],
    queryFn: () => api.get(DMUSIC.LIBRARY.MY_PLAYLISTS),
    enabled: !!user,
  });

  if (!user) {
    return (
      <>
        <TopBar />
        <Empty>
          Bạn cần <Link to="/music/login" style={{ color: "var(--accent)" }}>đăng nhập</Link> để xem thư viện cá nhân.
        </Empty>
      </>
    );
  }

  if (isLoading) return <Loading />;

  const playlists = data?.playlists || [];

  return (
    <>
      <TopBar />
      <h1 className="page-title" style={{ marginTop: 12 }}>Thư viện</h1>
      <p className="muted">Chào mừng, {user.full_name || user.username}! Đây là các playlist của bạn.</p>

      <div className="section-head">
        <h2 className="section-title-lg">📚 Playlist của bạn</h2>
      </div>

      {playlists.length === 0 ? (
        <Empty text="Bạn chưa tạo playlist nào. Khám phá các playlist công khai ở trang chủ." />
      ) : (
        <div className="playlist-grid">
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </div>
      )}

      <div className="section-head" style={{ marginTop: 36 }}>
        <h2 className="section-title-lg">Truy cập nhanh</h2>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link to="/music/liked" className="song-card" style={{ textDecoration: "none", display: "block", width: "min(220px, 100%)" }}>
          <div className="title">💚 Bài hát đã thích</div>
          <div className="artist">Xem toàn bộ bài hát bạn đã thả tim</div>
        </Link>
        <Link to="/music/history" className="song-card" style={{ textDecoration: "none", display: "block", width: "min(220px, 100%)" }}>
          <div className="title">🕘 Lịch sử nghe</div>
          <div className="artist">Xem lại các bài hát đã nghe gần đây</div>
        </Link>
      </div>
    </>
  );
}
