import { memo } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, MoreHorizontal, Heart, Download, ListPlus, ListMusic, ArrowRightToLine, Radio, Edit3 } from "lucide-react";
import { usePlayer, formatTime } from "@/components/music/contexts/PlayerContext";
import { useAuth } from "@/components/music/contexts/AuthContext";
import api from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/music/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// memo: hàng danh sách dài — chỉ re-render khi song/state thực sự đổi
export default memo(function SongRow({ song, index, contextSongs, showAlbum = false, showCover = true }) {
  const p = usePlayer();
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const isCurrent = p.current?.id === song.id;
  const isPlaying = isCurrent && p.isPlaying;

  const { data: detail } = useQuery({
    queryKey: ["song", song.id, "liked-flag"],
    queryFn: async () => (await api.get(`/songs/${song.id}`)).data,
    enabled: !!user,
  });

  const { data: myPlaylists } = useQuery({
    queryKey: ["playlists", "mine"],
    queryFn: async () => (await api.get("/playlists?mine=true")).data.items,
    enabled: !!user,
  });

  const like = useMutation({
    mutationFn: async () => (await api.post(`/songs/${song.id}/like`)).data,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["song", song.id] });
      qc.invalidateQueries({ queryKey: ["liked"] });
      toast.success(d.liked ? "Đã thêm vào yêu thích" : "Đã xoá khỏi yêu thích");
    },
    onError: () => toast.error("Vui lòng đăng nhập"),
  });

  const addTo = useMutation({
    mutationFn: async (playlist_id) => (await api.post(`/playlists/${playlist_id}/songs`, { song_id: song.id })).data,
    onSuccess: () => toast.success("Đã thêm vào playlist"),
    onError: (e) => toast.error(e.response?.data?.detail || "Lỗi"),
  });

  const onPlay = () => {
    if (isCurrent) p.toggle();
    else p.playSong(song, contextSongs);
  };

  const download = async (type) => {
    try {
      const { data } = await api.post(`/songs/${song.id}/download?file_type=${type}`);
      if (data.lrc) {
        const blob = new Blob([data.lrc], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${song.folder_name || song.id}.lrc`;
        a.click();
      } else if (data.url) {
        window.open(data.url, "_blank");
      }
      toast.success(`Đã tải xuống ${type.toUpperCase()}`);
    } catch {
      toast.error("Lỗi tải xuống");
    }
  };

  return (
    <div
      data-testid={`song-row-${song.id}`}
      className={`group grid items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 transition-colors ${
        showAlbum ? "grid-cols-[32px_1fr_1fr_60px_40px]" : "grid-cols-[32px_1fr_60px_40px]"
      }`}
    >
      <div className="w-8 flex items-center justify-center text-white/50 text-sm">
        {isPlaying ? (
          <button data-testid={`row-pause-${song.id}`} onClick={onPlay} aria-label="Pause">
            <Pause className="w-4 h-4 text-white fill-white" />
          </button>
        ) : (
          <>
            <span className="group-hover:hidden tabular-nums">{index}</span>
            <button
              data-testid={`row-play-${song.id}`}
              onClick={onPlay}
              className="hidden group-hover:block"
              aria-label="Play"
            >
              <Play className="w-4 h-4 text-white fill-white" />
            </button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 min-w-0">
        {showCover && (
          <img
            src={song.cover_url}
            alt={`Ảnh bìa bài hát ${song.title}`}
            loading="lazy"
            decoding="async"
            className="w-10 h-10 rounded object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className={`truncate text-sm font-medium ${isCurrent ? "text-[#1ed760]" : "text-white"}`}>
            {song.title}
          </div>
          <Link
            to={`/artist/${encodeURIComponent(song.artist)}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate text-xs text-white/60 hover:text-white hover:underline block"
          >
            {song.artist}
          </Link>
        </div>
      </div>
      {showAlbum && (
        <div className="truncate text-xs text-white/60 hidden md:block">
          {song.total_views?.toLocaleString()} lượt nghe
        </div>
      )}
      <div className="text-xs text-white/50 tabular-nums text-right">
        {formatTime(song.duration)}
      </div>
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          data-testid={`row-like-${song.id}`}
          onClick={() => (user ? like.mutate() : toast.error("Vui lòng đăng nhập"))}
          aria-label="Like"
          className="p-1.5 rounded hover:bg-white/10"
        >
          <Heart
            className={`w-4 h-4 ${detail?.liked ? "text-[#1ed760] fill-[#1ed760]" : "text-white/70"}`}
          />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid={`row-more-${song.id}`}
              className="p-1.5 rounded hover:bg-white/10 text-white/70"
              aria-label="Thêm"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#181818] border-white/10 text-white min-w-[220px]">
            <DropdownMenuItem
              data-testid={`row-radio-${song.id}`}
              onClick={async () => {
                try {
                  const { data } = await api.get(`/songs/${song.id}/radio?limit=25`);
                  if (data.items?.length) {
                    p.playQueue(data.items, 0);
                    toast.success("Đã bắt đầu Radio");
                  }
                } catch {
                  toast.error("Lỗi tạo radio");
                }
              }}
              className="cursor-pointer"
            >
              <Radio className="w-4 h-4 mr-2" /> Bắt đầu Radio
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                p.playNext(song);
                toast.success("Sẽ phát kế tiếp");
              }}
              className="cursor-pointer"
            >
              <ArrowRightToLine className="w-4 h-4 mr-2" /> Phát kế tiếp
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                p.addToQueue(song);
                toast.success("Đã thêm vào danh sách phát");
              }}
              className="cursor-pointer"
            >
              <ListMusic className="w-4 h-4 mr-2" /> Thêm vào hàng chờ
            </DropdownMenuItem>
            {user?.role === "admin" && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  data-testid={`row-edit-lrc-${song.id}`}
                  onClick={() => nav(`/lyrics-editor/${song.id}`)}
                  className="cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Sửa lời bài hát
                </DropdownMenuItem>
              </>
            )}
            {user && myPlaylists?.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <ListPlus className="w-4 h-4 mr-2" /> Thêm vào playlist
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-[#181818] border-white/10 text-white max-h-64 overflow-auto">
                  {myPlaylists.map((pl) => (
                    <DropdownMenuItem
                      key={pl.id}
                      onClick={() => addTo.mutate(pl.id)}
                      className="cursor-pointer"
                    >
                      {pl.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" /> Tải xuống
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-[#181818] border-white/10 text-white">
                <DropdownMenuItem onClick={() => download("mp3")}>MP3 (Nhạc)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => download("beat")}>Beat</DropdownMenuItem>
                <DropdownMenuItem onClick={() => download("mp4")}>MV (Video)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => download("lrc")}>Lời (LRC)</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
