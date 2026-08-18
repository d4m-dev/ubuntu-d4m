// src/pages/music/pages/ArtistPage.jsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { ENDPOINTS } from "@/config/api";
import SongRow from "@/components/music/SongRow";
import { usePlayer } from "@/components/music/contexts/PlayerContext";
import { useAuth } from "@/components/music/contexts/AuthContext";
import { Play, Pause, Users, Verified, Clock } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/common/SEO";

export default function ArtistPage() {
  const { name } = useParams();
  const decoded = decodeURIComponent(name);
  const p = usePlayer();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: artist, isLoading } = useQuery({
    queryKey: ["artist", decoded],
    queryFn: async () => (await api.get(ENDPOINTS.ARTIST.DETAIL(encodeURIComponent(decoded)))).data,
  });

  const follow = useMutation({
    mutationFn: async () =>
      (await api.post(ENDPOINTS.ARTIST.FOLLOW(encodeURIComponent(decoded)))).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["artist", decoded] });
      qc.invalidateQueries({ queryKey: ["followed-artists"] });
      toast.success(d.followed ? "Đã theo dõi" : "Đã bỏ theo dõi");
    },
    onError: () => toast.error("Vui lòng đăng nhập"),
  });

  if (isLoading) return <div className="p-8 text-white/60">Đang tải...</div>;
  if (!artist) return <div className="p-8 text-white/60">Không tìm thấy nghệ sĩ</div>;

  const isCurrent = p.current && artist.songs.some((s) => s.id === p.current.id);
  const initial = artist.name.charAt(0).toUpperCase();

  return (
    <div>
      {/* SEO — title theo tên nghệ sĩ khi user chuyển trang */}
      <SEO title={artist.name} description={`Nghe nhạc của nghệ sĩ ${artist.name} trên D4M Music Pro`} />
      {/* Hero */}
      <div className="relative min-h-[320px] lg:min-h-[380px] flex items-end">
        <img
          src={artist.cover_url}
          alt={`Ảnh bìa của nghệ sĩ ${artist.name}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/70 to-black/30" />
        <div className="relative z-10 p-6 lg:p-10 w-full">
          <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
            <Verified className="w-4 h-4 text-[#1ed760] fill-[#1ed760]" />
            <span>Nghệ sĩ đã xác minh</span>
          </div>
          <h1 className="text-5xl lg:text-8xl font-black tracking-tight mb-4" style={{ fontFamily: "Outfit" }}>
            {artist.name}
          </h1>
          <div className="text-sm text-white/70">
            <Users className="inline w-4 h-4 mr-1" />
            {artist.followers.toLocaleString()} người theo dõi ·{" "}
            {artist.total_views.toLocaleString()} lượt nghe · {artist.song_count} bài
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 lg:px-8 py-6 flex items-center gap-4">
        <button
          data-testid="artist-play-all"
          onClick={() =>
            isCurrent && p.isPlaying ? p.toggle() : p.playQueue(artist.songs, 0)
          }
          className="w-14 h-14 rounded-full bg-[#1ed760] hover:bg-[#1db954] hover:scale-105 transition-transform text-black flex items-center justify-center shadow-2xl"
          aria-label="Play all"
        >
          {isCurrent && p.isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </button>
        <button
          data-testid="follow-artist-btn"
          onClick={() => (user ? follow.mutate() : nav("/login"))}
          className={`h-10 px-6 rounded-full font-semibold text-sm border transition-colors ${
            artist.is_followed
              ? "border-white text-white hover:bg-white/10"
              : "border-white/30 text-white hover:border-white"
          }`}
        >
          {artist.is_followed ? "Đang theo dõi" : "Theo dõi"}
        </button>
      </div>

      {/* Songs */}
      <div className="px-4 lg:px-8 pb-4">
        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "Outfit" }}>
          Bài hát nổi bật
        </h2>
        <div className="grid grid-cols-[32px_1fr_1fr_60px_40px] gap-3 px-3 py-2 text-xs uppercase tracking-widest text-white/50 border-b border-white/5">
          <div>#</div>
          <div>Tiêu đề</div>
          <div className="hidden md:block">Lượt nghe</div>
          <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
          <div></div>
        </div>
        <div className="mt-2">
          {artist.songs.map((s, i) => (
            <SongRow key={s.id} song={s} index={i + 1} contextSongs={artist.songs} showAlbum />
          ))}
        </div>
      </div>
    </div>
  );
}