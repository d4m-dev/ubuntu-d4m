import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongRow, SongListHeader, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";
import { ENDPOINTS } from "../../../config/api";

export default function Admin() {
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["search", "", user?.id],
    queryFn: () => api.get(DMUSIC.MUSIC.SEARCH("")),
    enabled: isAdmin,
  });

  // Biểu đồ thống kê (lượt nghe/thích 7 ngày)
  const { data: analytics } = useQuery({
    queryKey: ["music-analytics"],
    queryFn: () => api.get(ENDPOINTS.MUSIC_ANALYTICS),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <>
        <TopBar />
        <Empty>
          Bạn không có quyền quản trị.{" "}
          <Link to="/music/login" style={{ color: "var(--accent)" }}>Đăng nhập tài khoản admin</Link>
        </Empty>
      </>
    );
  }

  if (isLoading) return <Loading />;

  const songs = data?.results || [];
  const totalViews = songs.reduce((a, s) => a + (s.total_views || 0), 0);
  const totalLikes = songs.reduce((a, s) => a + (s.total_likes || 0), 0);

  return (
    <>
      <TopBar />
      <h1 className="page-title" style={{ marginTop: 12 }}>🛠️ Quản trị hệ thống</h1>
      <p className="muted">Bảng điều khiển quản lý kho nhạc D4M Music Pro.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, margin: "20px 0" }}>
        <Stat label="Tổng bài hát" value={songs.length} />
        <Stat label="Tổng lượt nghe" value={totalViews.toLocaleString("vi-VN")} />
        <Stat label="Tổng lượt thích" value={totalLikes.toLocaleString("vi-VN")} />
      </div>

      {/* 📊 Biểu đồ thống kê 7 ngày */}
      {analytics?.data && (
        <div className="d4m-card" style={{ margin: "20px 0" }}>
          <h2 className="section-title-lg" style={{ margin: "0 0 16px", fontSize: 16 }}>📊 Lượt nghe & thả tim (7 ngày)</h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
            {analytics.data.labels.map((label, i) => {
              const v = analytics.data.views[i] || 0;
              const max = Math.max(...analytics.data.views, 1);
              const h = Math.max((v / max) * 100, 3);
              return (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{v}</span>
                  <div style={{ width: "100%", height: 100, display: "flex", alignItems: "flex-end" }}>
                    <div style={{ width: "100%", height: `${h}%`, background: "linear-gradient(180deg,#1ed760,#0a4d2b)", borderRadius: "4px 4px 0 0" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{label}</span>
                </div>
              );
            })}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Tổng bài: {analytics.data.totals?.songs} • Tổng lượt nghe: {(analytics.data.totals?.views || 0).toLocaleString("vi-VN")}</p>
        </div>
      )}

      <div className="section-head">
        <h2 className="section-title-lg">Kho nhạc</h2>
      </div>

      {songs.length === 0 ? (
        <Empty text="Chưa có dữ liệu." />
      ) : (
        <div className="song-list">
          <SongListHeader />
          {songs.map((s, i) => (
            <SongRow key={s.id} song={s} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: "var(--bg-elev2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
      <div className="hint" style={{ margin: 0 }}>{label}</div>
    </div>
  );
}
