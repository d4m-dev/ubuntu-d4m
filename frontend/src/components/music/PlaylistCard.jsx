import { memo } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { usePlayer } from "@/components/music/contexts/PlayerContext";
import api from "@/services/api";
import { ENDPOINTS, API_BASE_URL } from "@/config/api"; // Added config
import { STATIC } from "@/config/urls";

// Hàm Helper dùng chung để lấy ảnh bìa (đồng bộ với Home.jsx)
const getCoverUrl = (item) => {
  if (!item) return STATIC.FALLBACK_COVER;
  const coverFile = item.cover_image || item.cover;
  const project = item.folder_name || item.project || "unknown";

  if (!coverFile) return STATIC.FALLBACK_COVER;
  if (coverFile.startsWith("http")) return coverFile;
  if (coverFile.startsWith("/api")) return API_BASE_URL + coverFile;

  return ENDPOINTS.MUSIC.COVER(project, coverFile);
};

export default memo(function PlaylistCard({ playlist }) {
  const p = usePlayer();

  const onPlay = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { data } = await api.get(`${ENDPOINTS.PLAYLISTS.BASE}/${playlist.id}`);
      if (data.songs?.length) p.playQueue(data.songs, 0);
    } catch {}
  };

  return (
    <Link
      to={`/music/playlist/${playlist.id}`} // FIX VĂNG TRANG
      data-testid={`playlist-card-${playlist.id}`}
      className="group relative block rounded-xl bg-white/[0.03] hover:bg-white/[0.07] p-4 transition-colors"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow-lg">
        {/* FIX ẢNH BÌA — lazy + decoding async để không chặn render ảnh ngoài viewport */}
        <img
          src={getCoverUrl(playlist)}
          alt={`Ảnh bìa playlist ${playlist.name}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <button
          data-testid={`playlist-play-${playlist.id}`}
          onClick={onPlay}
          aria-label="Play"
          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1ed760] text-black shadow-xl translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all hover:scale-105 flex items-center justify-center"
        >
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </button>
      </div>
      <div className="font-semibold truncate" style={{ fontFamily: "Outfit" }}>
        {playlist.name}
      </div>
      <div className="text-xs text-white/60 mt-1 line-clamp-2 min-h-[2rem]">
        {playlist.description}
      </div>
    </Link>
  );
});

// memo: tránh re-render khi danh sách dài được scroll / state player thay đổi
export const SongCard = memo(function SongCard({ song, contextSongs }) {
  const p = usePlayer();
  return (
    <button
      data-testid={`song-card-${song.id}`}
      onClick={() => p.playSong(song, contextSongs)}
      className="group text-left relative block rounded-xl bg-white/[0.03] hover:bg-white/[0.07] p-4 transition-colors w-full"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow-lg">
        {/* FIX ẢNH BÌA — lazy + decoding async */}
        <img
          src={getCoverUrl(song)}
          alt={`Ảnh bìa bài hát ${song.title}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1ed760] text-black shadow-xl translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all flex items-center justify-center">
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </div>
      </div>
      <div className="font-semibold truncate" style={{ fontFamily: "Outfit" }}>
        {song.title}
      </div>
      <div className="text-xs text-white/60 mt-1 truncate">{song.artist}</div>
    </button>
  );
});