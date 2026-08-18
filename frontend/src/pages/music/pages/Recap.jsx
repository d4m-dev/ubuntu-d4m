// src/pages/music/pages/Recap.jsx
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { ENDPOINTS } from "@/config/api"; // Added Config
import { useAuth } from "@/components/music/contexts/AuthContext";
import { usePlayer, formatTime } from "@/components/music/contexts/PlayerContext";
import { Sparkles, Play, Music2, Users, Clock, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/music/ui/button";

export default function Recap() {
  const { user } = useAuth();
  const nav = useNavigate();
  const p = usePlayer();
  const cardRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["recap", 7],
    queryFn: async () => (await api.get(`${ENDPOINTS.RECAP}?days=7`)).data,
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="p-8 py-32 text-center">
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "Outfit" }}>Weekly Recap</h1>
        <p className="text-white/60 mb-6">Đăng nhập để xem bảng tổng kết tuần</p>
        <button
          onClick={() => nav("/login")}
          className="bg-[#1ed760] text-black rounded-full h-11 px-8 font-semibold"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  if (isLoading || !data) return <div className="p-8 text-white/60">Đang tổng hợp...</div>;

  const empty = data.total_plays === 0;
  const shareText = `Tuần này tôi đã nghe ${data.total_plays} lượt trên D4M Music Pro! 🎵`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "D4M Weekly Recap", text: shareText, url: window.location.origin });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText + " " + window.location.origin);
        toast.success("Đã sao chép nội dung recap");
      }
    } catch {}
  };

  const playTop = () => {
    if (data.top_songs?.length) p.playQueue(data.top_songs, 0);
  };

  return (
    <div className="px-4 lg:px-8 pt-6 lg:pt-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-6 h-6 text-[#1ed760]" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#1ed760]">Chủ Nhật · 7 ngày qua</div>
          <h1 className="text-3xl lg:text-4xl font-black" style={{ fontFamily: "Outfit" }}>
            Bảng tổng kết tuần
          </h1>
        </div>
      </div>

      {empty ? (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-10 text-center">
          <Music2 className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <div className="font-semibold text-lg" style={{ fontFamily: "Outfit" }}>
            Chưa có dữ liệu nghe tuần này
          </div>
          <div className="text-sm text-white/60 mt-1">
            Nghe vài bài rồi quay lại đây để xem bảng recap của bạn nhé!
          </div>
        </div>
      ) : (
        <>
          {/* Recap Card - shareable */}
          <div
            ref={cardRef}
            data-testid="recap-card"
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-800 p-6 lg:p-8 mb-6 shadow-2xl"
          >
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.4) 0%, transparent 45%)",
            }} />
            <div className="relative flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/80">D4M Music Pro</div>
                <div className="font-black text-2xl" style={{ fontFamily: "Outfit" }}>
                  Recap của {user.full_name}
                </div>
              </div>
              <Sparkles className="w-8 h-8 text-white/80" />
            </div>

            <div className="relative grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl bg-black/25 p-4">
                <div className="text-[10px] uppercase tracking-widest text-white/70 mb-1">Tổng lượt nghe</div>
                <div className="text-4xl font-black tabular-nums" style={{ fontFamily: "Outfit" }}>
                  {data.total_plays}
                </div>
              </div>
              <div className="rounded-2xl bg-black/25 p-4">
                <div className="text-[10px] uppercase tracking-widest text-white/70 mb-1">Thời lượng</div>
                <div className="text-4xl font-black tabular-nums" style={{ fontFamily: "Outfit" }}>
                  {data.total_minutes}
                  <span className="text-lg font-semibold ml-1">phút</span>
                </div>
              </div>
            </div>

            {/* Top songs */}
            <div className="relative mb-5">
              <div className="text-xs uppercase tracking-widest text-white/70 mb-2 flex items-center gap-2">
                <Music2 className="w-3.5 h-3.5" /> Top {data.top_songs.length} bài
              </div>
              <div className="space-y-1.5">
                {data.top_songs.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 bg-black/20 rounded-lg p-2">
                    <span className="w-5 text-lg font-black text-white/90" style={{ fontFamily: "Outfit" }}>
                      {i + 1}
                    </span>
                    <img src={s.cover_url} alt="" className="w-10 h-10 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{s.title}</div>
                      <div className="text-[11px] text-white/70 truncate">{s.artist}</div>
                    </div>
                    <div className="text-xs text-white/80 tabular-nums">{s.plays} lượt</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top artists */}
            {data.top_artists.length > 0 && (
              <div className="relative">
                <div className="text-xs uppercase tracking-widest text-white/70 mb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Nghệ sĩ yêu thích
                </div>
                <div className="flex gap-2">
                  {data.top_artists.map((a) => (
                    <div key={a.name} className="flex-1 rounded-lg bg-black/20 p-2 text-center">
                      {a.cover_url && (
                        <img src={a.cover_url} alt="" className="w-12 h-12 rounded-full object-cover mx-auto mb-1" />
                      )}
                      <div className="text-xs font-semibold truncate">{a.name}</div>
                      <div className="text-[10px] text-white/70">{a.plays} lượt</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="recap-play"
              onClick={playTop}
              className="bg-[#1ed760] hover:bg-[#1db954] text-black rounded-full"
            >
              <Play className="w-4 h-4 mr-1 fill-current" /> Phát top bài của bạn
            </Button>
            <Button
              data-testid="recap-share"
              onClick={share}
              variant="outline"
              className="border-white/20 hover:bg-white/10 rounded-full text-white"
            >
              <Share2 className="w-4 h-4 mr-1" /> Chia sẻ recap
            </Button>
          </div>
        </>
      )}
    </div>
  );
}