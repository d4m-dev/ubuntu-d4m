import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongRow, SongListHeader, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";

export default function History() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: () => api.get(DMUSIC.LIBRARY.HISTORY),
    enabled: !!user,
  });

  if (!user) {
    return (
      <>
        <TopBar />
        <Empty>
          Bạn cần <Link to="/login" style={{ color: "var(--accent)" }}>đăng nhập</Link> để xem lịch sử nghe.
        </Empty>
      </>
    );
  }

  if (isLoading) return <Loading />;

  const songs = data?.songs || [];

  return (
    <>
      <TopBar />
      <h1 className="page-title" style={{ marginTop: 12 }}>🕘 Lịch sử nghe</h1>
      <p className="hint">Các bài hát bạn đã nghe gần đây.</p>

      {songs.length === 0 ? (
        <Empty text="Chưa có lịch sử nghe. Hãy phát một bài hát nào đó!" />
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
