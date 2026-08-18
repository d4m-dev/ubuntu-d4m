import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongRow, SongListHeader, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import TopBar from "../../../components/music/ui/TopBar";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, user?.id],
    queryFn: () => api.get(DMUSIC.MUSIC.SEARCH(q)),
    enabled: q.trim().length > 0,
  });

  const songs = data?.results || [];

  return (
    <>
      <TopBar defaultQuery={q} />
      <h1 className="page-title" style={{ marginTop: 12 }}>
        {q.trim() ? (
          <>Kết quả cho “{q}”</>
        ) : (
          <>Tìm kiếm</>
        )}
      </h1>
      <p className="hint">
        {q.trim()
          ? `Tìm thấy ${data?.total ?? 0} bài hát.`
          : "Nhập từ khóa ở ô trên để tìm bài hát hoặc nghệ sĩ."}
      </p>

      {isLoading ? (
        <Loading />
      ) : songs.length === 0 ? (
        <Empty text={q.trim() ? "Không tìm thấy bài hát nào." : "Bắt đầu tìm kiếm ngay!"} />
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
