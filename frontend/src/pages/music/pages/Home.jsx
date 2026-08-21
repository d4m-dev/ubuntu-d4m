import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "../../../components/music/contexts/PlayerContext";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongCard, PlaylistCard, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { user } = useAuth();
  const p = usePlayer();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["home", user?.id],
    queryFn: () => api.get(DMUSIC.MUSIC.HOME),
  });

  if (isLoading) return <Loading />;

  const trending = data?.trending || [];
  const playlists = data?.playlists || [];

  return (
    <>
      <TopBar />
      <h1 className="page-title" style={{ marginTop: 12 }}>
        Chào mừng đến D4M Music 🎧
      </h1>
      <p className="muted">Khám phá những bản hit đang thịnh hành và danh sách phát yêu thích.</p>

      <div className="section-head">
        <h2 className="section-title-lg">🔥 Thịnh hành</h2>
        <span className="link-more" style={{ cursor: "pointer" }} onClick={() => navigate("/music/search")}>
          Xem tất cả
        </span>
      </div>

      {trending.length === 0 ? (
        <Empty text="Chưa có bài hát nào." />
      ) : (
        <div className="card-grid">
          {trending.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </div>
      )}

      <div className="section-head">
        <h2 className="section-title-lg">🎵 Danh sách phát</h2>
      </div>

      {playlists.length === 0 ? (
        <Empty text="Chưa có playlist công khai." />
      ) : (
        <div className="playlist-grid">
          {playlists.map((pl) => (
            <PlaylistCard key={pl.id} playlist={pl} />
          ))}
        </div>
      )}
    </>
  );
}
