import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, formatTime } from "@/components/music/contexts/PlayerContext";
import api from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Video,
  Mic2,
} from "lucide-react";

function parseLRC(lrc = "") {
  const lines = lrc.split("\n").map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (!m) continue;
    const t = parseInt(m[1]) * 60 + parseFloat(m[2]);
    const text = m[3].trim();
    if (text) out.push({ t, text });
  }
  return out.sort((a, b) => a.t - b.t);
}

export default function NowPlayingModal() {
  const p = usePlayer();
  const [mode, setMode] = useState("lyrics"); // lyrics | video
  const listRef = useRef(null);
  const song = p.current;

  const { data: detail } = useQuery({
    queryKey: ["song-detail", song?.id],
    queryFn: async () => (await api.get(`/songs/${song.id}`)).data,
    enabled: !!song?.id && p.showFullScreen,
  });

  const lrc = useMemo(() => parseLRC(detail?.lrc), [detail]);

  const activeIdx = useMemo(() => {
    if (!lrc.length) return -1;
    let idx = -1;
    for (let i = 0; i < lrc.length; i++) {
      if (lrc[i].t <= p.progress) idx = i;
      else break;
    }
    return idx;
  }, [lrc, p.progress]);

  useEffect(() => {
    if (!listRef.current || activeIdx < 0) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  if (!p.showFullScreen || !song) return null;

  const pct = p.duration ? (p.progress / p.duration) * 100 : 0;

  return (
    <div
      data-testid="now-playing-modal"
      className="fixed inset-0 z-50 text-white overflow-hidden"
    >
      {/* Backdrop art */}
      <div className="absolute inset-0">
        <img
          src={song.cover_url}
          alt=""
          className="w-full h-full object-cover blur-3xl scale-110 opacity-30"
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <div className="relative h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <button
            data-testid="close-now-playing"
            onClick={() => p.setShowFullScreen(false)}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Đóng"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <div className="text-xs uppercase tracking-widest text-white/60">
            Đang phát
          </div>
          <div className="flex gap-1">
            <button
              data-testid="mode-lyrics"
              onClick={() => setMode("lyrics")}
              className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 ${mode === "lyrics" ? "bg-white/15" : "hover:bg-white/5"}`}
            >
              <Mic2 className="w-3.5 h-3.5" /> Lời
            </button>
            <button
              data-testid="mode-video"
              onClick={() => setMode("video")}
              className={`px-3 h-8 rounded-full text-xs flex items-center gap-1 ${mode === "video" ? "bg-white/15" : "hover:bg-white/5"}`}
            >
              <Video className="w-3.5 h-3.5" /> MV
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-6 lg:gap-10 px-4 lg:px-16 pb-40 lg:pb-32">
          {/* Left: cover */}
          <div className="flex flex-col items-center justify-center gap-6">
            {mode === "video" && song.video_url ? (
              <video
                data-testid="mv-video"
                key={song.video_url}
                src={song.video_url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full max-w-[520px] aspect-video rounded-2xl object-cover shadow-2xl"
              />
            ) : (
              <img
                src={song.cover_url}
                alt={song.title}
                className={`w-full max-w-[380px] aspect-square rounded-2xl object-cover shadow-2xl ${p.isPlaying ? "vinyl-spin" : ""}`}
              />
            )}
            <div className="text-center">
              <h2
                className="text-2xl lg:text-3xl font-bold"
                style={{ fontFamily: "Outfit" }}
              >
                {song.title}
              </h2>
              <p className="text-white/60 mt-1">{song.artist}</p>
            </div>
          </div>

          {/* Right: lyrics */}
          <div className="min-h-0 flex flex-col">
            <div
              ref={listRef}
              data-testid="lyrics-container"
              className="flex-1 overflow-y-auto pr-2 space-y-4 py-8"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0, black 20%, black 80%, transparent 100%)",
              }}
            >
              {lrc.length ? (
                lrc.map((line, i) => (
                  <p
                    key={i}
                    data-idx={i}
                    onClick={() => p.seek(line.t)}
                    className={`text-xl lg:text-3xl leading-tight cursor-pointer transition-all duration-300 select-none ${
                      i === activeIdx
                        ? "text-white font-bold scale-[1.02]"
                        : i < activeIdx
                          ? "text-white/25"
                          : "text-white/40"
                    }`}
                    style={{ fontFamily: "Outfit" }}
                  >
                    {line.text}
                  </p>
                ))
              ) : (
                <div className="text-center text-white/40 py-16">
                  Đang tải lời bài hát...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute left-0 right-0 bottom-0 px-4 lg:px-16 pb-6 pt-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-white/60 tabular-nums w-10 text-right">
                {formatTime(p.progress)}
              </span>
              <input
                type="range"
                className="player-range flex-1"
                style={{ "--val": `${pct}%` }}
                min={0}
                max={p.duration || 0}
                step={0.1}
                value={p.progress}
                onChange={(e) => p.seek(parseFloat(e.target.value))}
                aria-label="Vị trí"
              />
              <span className="text-[10px] text-white/60 tabular-nums w-10">
                {formatTime(p.duration)}
              </span>
            </div>
            <div className="flex items-center justify-center gap-5 mt-3">
              <button
                onClick={() => p.setShuffle(!p.shuffle)}
                className={p.shuffle ? "text-[#1ed760]" : "text-white/70"}
                aria-label="Ngẫu nhiên"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={p.prevSong} aria-label="Trước">
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              <button
                onClick={p.toggle}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                aria-label={p.isPlaying ? "Pause" : "Play"}
              >
                {p.isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>
              <button onClick={p.nextSong} aria-label="Kế tiếp">
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
              <button
                onClick={() =>
                  p.setRepeat(
                    p.repeat === "off" ? "all" : p.repeat === "all" ? "one" : "off",
                  )
                }
                className={p.repeat !== "off" ? "text-[#1ed760]" : "text-white/70"}
                aria-label="Lặp"
              >
                {p.repeat === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
