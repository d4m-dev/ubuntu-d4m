import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePlayer } from "../../../components/music/contexts/PlayerContext";
import { useAuth } from "../../../components/music/contexts/AuthContext";
import { api } from "../../../api/client";
import { DMUSIC } from "../../../config/urls";
import { SongRow, SongListHeader, Loading, Empty } from "../../../components/music/ui/PlayerUI";
import { PlayIcon } from "../../../components/music/ui/Icons";
import TopBar from "../../../components/music/ui/TopBar";
import { STATIC } from "../../../config/urls";

export default function PlaylistDetail() {
  const { id } = useParams();
  const p = usePlayer();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["playlist", id, user?.id],
    queryFn: () => api.get(DMUSIC.MUSIC.PLAYLIST(id)),
  });

  if (isLoading) return <Loading />;

  const pl = data?.playlist;
  const songs = data?.songs || [];

  if (!pl) return <Empty text="Không tìm thấy danh sách phát." />;

  return (
    <>
      <TopBar />
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end", marginTop: 12 }}>
        <img
          src={pl.cover || STATIC.FALLBACK_COVER}
          alt={pl.name}
          style={{ width: 200, height: 200, borderRadius: 12, objectFit: "cover", background: "#222", boxShadow: "0 12px 30px rgba(0,0,0,.6)" }}
        />
        <div>
          <div className="badge-admin" style={{ display: "inline-block" }}>PLAYLIST</div>
          <h1 className="page-title" style={{ fontSize: 40, margin: "8px 0" }}>{pl.name}</h1>
          {pl.description && <p className="muted" style={{ marginTop: 0 }}>{pl.description}</p>}
          <p className="hint">{pl.song_count} bài hát</p>
        </div>
      </div>

      <button
        onClick={() => p.playQueue(songs, 0)}
        style={{
          margin: "20px 0", display: "flex", alignItems: "center", gap: 10,
          background: "var(--accent)", color: "#000", border: "none",
          padding: "12px 26px", borderRadius: 30, fontWeight: 700, fontSize: 15,
        }}
      >
        <PlayIcon /> Phát tất cả
      </button>

      {songs.length === 0 ? (
        <Empty text="Playlist này chưa có bài hát." />
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
