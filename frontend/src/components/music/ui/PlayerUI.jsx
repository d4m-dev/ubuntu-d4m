import { useNavigate } from "react-router-dom";
import { usePlayer } from "../contexts/PlayerContext";
import { PlayIcon, PauseIcon, HeartIcon, ClockIcon } from "./Icons";
import { fmtDuration, fmtCount } from "../../../lib/format";
import { useAuth } from "../contexts/AuthContext";
import { STATIC } from "../../../config/urls";
import { toast } from "sonner";

/* ===== Card hiển thị một bài hát (lưới) ===== */
export function SongCard({ song }) {
  const p = usePlayer();

  const isCurrent = p.current && p.current.id === song.id;
  const isPlaying = isCurrent && p.playing;

  return (
    <div className="song-card" onClick={() => p.playNow(song)}>
      <div className="art">
        <img src={song.cover} alt={song.title} loading="lazy" />
        <button
          className="play-fab"
          aria-label={isPlaying ? `Tạm dừng ${song.title}` : `Phát ${song.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isCurrent) p.togglePlay();
            else p.playNow(song);
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
      <div className="title">{song.title}</div>
      <div className="artist">{song.artist}</div>
    </div>
  );
}

/* ===== Row hiển thị một bài hát (danh sách) ===== */
export function SongRow({ song, index, showHeader }) {
  const p = usePlayer();
  const { user } = useAuth();

  const isCurrent = p.current && p.current.id === song.id;
  const isPlaying = isCurrent && p.playing;

  const onLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await p.toggleLike(song);
      toast.success(res.liked ? "Đã thả tim" : "Đã bỏ thích");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="song-row" onClick={() => {
      if (isCurrent) p.togglePlay();
      else p.playNow(song);
    }}>
      <div className="idx">
        {isCurrent && isPlaying ? <PauseIcon /> : isCurrent ? <PlayIcon /> : (index + 1)}
      </div>
      <img className="thumb" src={song.cover} alt="" loading="lazy" />
      <div className="tt">
        <div className="t" style={{ color: isCurrent ? "var(--accent)" : undefined }}>{song.title}</div>
        <div className="a">{song.artist}</div>
      </div>
      <div className="album">{song.artist}</div>
      <div className="plays">{fmtCount(song.total_views)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        <button
          className={`icon-btn ${song.liked ? "liked" : ""}`}
          onClick={onLike}
          style={{ color: song.liked ? "var(--accent)" : undefined }}
        >
          <HeartIcon filled={song.liked} />
        </button>
        <span className="dur">{fmtDuration(song.duration)}</span>
      </div>
    </div>
  );
}

export function SongListHeader() {
  return (
    <div className="song-row" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-faint)", fontSize: 13, cursor: "default" }}>
      <div className="idx">#</div>
      <div style={{ width: 46 }} />
      <div>Tiêu đề</div>
      <div>Nghệ sĩ</div>
      <div style={{ textAlign: "right" }}>Lượt nghe</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <ClockIcon /><span>Thời lượng</span>
      </div>
    </div>
  );
}

/* ===== Card hiển thị một playlist ===== */
export function PlaylistCard({ playlist }) {
  const navigate = useNavigate();
  return (
    <div className="playlist-card" onClick={() => navigate(`/music/playlist/${playlist.id}`)}>
      <div className="art">
        <img src={playlist.cover || STATIC.FALLBACK_COVER} alt={playlist.name} loading="lazy" />
      </div>
      <div className="meta">
        <div className="name">{playlist.name}</div>
        <div className="desc">
          {playlist.song_count} bài hát
          {playlist.description ? " • " + playlist.description : ""}
        </div>
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="spinner" />;
}

export function Empty({ text }) {
  return <div className="empty">{text}</div>;
}
