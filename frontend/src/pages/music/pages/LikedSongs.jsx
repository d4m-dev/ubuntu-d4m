import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongRow, SongListHeader, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";

export default function LikedSongs() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["liked", user?.id],
    queryFn: () => api.get(DMUSIC.LIBRARY.LIKED),
    enabled: !!user,
  });

  if (!user) {
    return (
      <>
        <TopBar />
        <Empty>
          Bạn cần <Link to="/music/login" style={{ color: "var(--accent)" }}>đăng nhập</Link> để xem bài hát đã thích.
        </Empty>
      </>
    );
  }

  if (isLoading) return <Loading />;

  const songs = data?.songs || [];

  return (
    <>
      <TopBar />
      <h1 className="page-title" style={{ marginTop: 12 }}>💚 Bài hát đã thích</h1>
      <p className="hint">{songs.length} bài hát bạn đã thả tim</p>

      {songs.length === 0 ? (
        <Empty text="Bạn chưa thích bài hát nào. Nhấn trái tim trên bài hát để lưu vào đây!" />
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
