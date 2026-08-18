// src/pages/music/pages/LyricsEditor.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { ENDPOINTS } from "@/config/api"; // Added Config
import { useAuth } from "@/components/music/contexts/AuthContext";
import { usePlayer, formatTime } from "@/components/music/contexts/PlayerContext";
import { toast } from "sonner";
import { Button } from "@/components/music/ui/button";
import { Play, Pause, Plus, Trash2, Save, ChevronLeft, Target, ArrowUp, ArrowDown } from "lucide-react";

function fmtTs(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `[${String(m).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}]`;
}

function parseLRC(text = "") {
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (m) {
      const t = parseInt(m[1]) * 60 + parseFloat(m[2]);
      out.push({ t, text: m[3].trim() });
    } else if (line.startsWith("[") && line.endsWith("]")) {
      // metadata line - skip
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

function serializeLRC(lines) {
  return lines
    .filter((l) => l.text.trim() || l.t > 0)
    .map((l) => `${fmtTs(l.t)}${l.text}`)
    .join("\n");
}

export default function LyricsEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const p = usePlayer();

  const { data: song, isLoading } = useQuery({
    queryKey: ["song-editor", id],
    queryFn: async () => (await api.get(ENDPOINTS.SONGS.DETAIL(id))).data,
  });

  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (song?.lrc) setLines(parseLRC(song.lrc));
  }, [song]);

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch(ENDPOINTS.SONGS.LRC(id), { lrc: serializeLRC(lines) })).data,
    onSuccess: () => toast.success("Đã lưu lời bài hát"),
    onError: (e) => toast.error(e.response?.data?.detail || "Không lưu được"),
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="p-8 py-32 text-center text-white/60">
        Trang này chỉ dành cho admin.
      </div>
    );
  }
  if (isLoading || !song) return <div className="p-8 text-white/60">Đang tải...</div>;

  const isCurrent = p.current?.id === song.id;
  const activeIdx = lines.findIndex((l, i) => {
    const next = lines[i + 1];
    return isCurrent && l.t <= p.progress && (!next || next.t > p.progress);
  });

  const updateLine = (i, patch) =>
    setLines((L) => L.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const nudge = (i, delta) =>
    setLines((L) => L.map((l, idx) => (idx === i ? { ...l, t: Math.max(0, l.t + delta) } : l)));

  const setToCurrent = (i) => {
    if (!audioIsSameSong(song.id, p)) {
      toast.error("Hãy phát bài này trước khi bấm 'Đặt tại đây'");
      return;
    }
    updateLine(i, { t: p.progress });
  };

  const insertLine = () => {
    setLines((L) => {
      const t = isCurrent ? p.progress : L.at(-1)?.t + 4 || 0;
      const next = [...L, { t, text: "" }];
      next.sort((a, b) => a.t - b.t);
      return next;
    });
  };

  const removeLine = (i) => setLines((L) => L.filter((_, idx) => idx !== i));

  const moveLine = (i, dir) =>
    setLines((L) => {
      const j = i + dir;
      if (j < 0 || j >= L.length) return L;
      const copy = L.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const playThisSong = () => {
    if (isCurrent) p.toggle();
    else p.playSong(song);
  };

  return (
    <div className="px-4 lg:px-8 pt-6 lg:pt-10 max-w-3xl">
      <button
        data-testid="editor-back"
        onClick={() => nav(-1)}
        className="text-white/60 hover:text-white text-sm flex items-center gap-1 mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Quay lại
      </button>

      <div className="flex items-center gap-4 mb-6">
        <img src={song.cover_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#1ed760]">Sửa lời</div>
          <h1 className="text-2xl lg:text-3xl font-black truncate" style={{ fontFamily: "Outfit" }}>
            {song.title}
          </h1>
          <div className="text-sm text-white/60 truncate">{song.artist}</div>
        </div>
        <button
          data-testid="editor-play"
          onClick={playThisSong}
          className="ml-auto w-11 h-11 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Play"
        >
          {isCurrent && p.isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {isCurrent && (
        <div className="mb-4 rounded-lg bg-white/[0.04] border border-white/10 p-3 text-xs text-white/70">
          Đang phát tại{" "}
          <span className="text-[#1ed760] font-mono tabular-nums">
            {formatTime(p.progress)}
          </span>{" "}
          — bấm 🎯 để đặt câu lời tại vị trí này.
        </div>
      )}

      <div className="space-y-1.5">
        {lines.map((line, i) => (
          <div
            key={i}
            data-testid={`editor-line-${i}`}
            className={`grid grid-cols-[88px_1fr_auto] gap-2 items-center p-2 rounded-md ${
              activeIdx === i ? "bg-[#1ed760]/10 ring-1 ring-[#1ed760]/40" : "bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => nudge(i, -0.2)}
                aria-label="-0.2s"
                className="w-6 h-6 rounded hover:bg-white/10 text-xs text-white/70"
              >
                –
              </button>
              <button
                data-testid={`editor-set-${i}`}
                onClick={() => setToCurrent(i)}
                aria-label="Đặt tại thời điểm hiện tại"
                className="p-1 rounded hover:bg-white/10 text-[#1ed760]"
              >
                <Target className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudge(i, 0.2)}
                aria-label="+0.2s"
                className="w-6 h-6 rounded hover:bg-white/10 text-xs text-white/70"
              >
                +
              </button>
            </div>
            <input
              value={line.text}
              onChange={(e) => updateLine(i, { text: e.target.value })}
              onFocus={() => {
                if (isCurrent) p.seek(line.t);
              }}
              className="bg-transparent border-b border-white/10 focus:border-[#1ed760] outline-none text-sm py-1"
              placeholder={fmtTs(line.t)}
            />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-white/50 font-mono tabular-nums w-14 text-right pr-1">
                {fmtTs(line.t)}
              </span>
              <button onClick={() => moveLine(i, -1)} aria-label="Up" className="p-1 hover:bg-white/10 rounded">
                <ArrowUp className="w-3.5 h-3.5 text-white/60" />
              </button>
              <button onClick={() => moveLine(i, 1)} aria-label="Down" className="p-1 hover:bg-white/10 rounded">
                <ArrowDown className="w-3.5 h-3.5 text-white/60" />
              </button>
              <button
                onClick={() => removeLine(i)}
                aria-label="Xoá"
                className="p-1 hover:bg-white/10 rounded text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button
          data-testid="editor-add-line"
          onClick={insertLine}
          variant="outline"
          className="border-white/20 hover:bg-white/10 text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-1" /> Thêm câu
        </Button>
        <Button
          data-testid="editor-save"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-[#1ed760] hover:bg-[#1db954] text-black rounded-full ml-auto"
        >
          <Save className="w-4 h-4 mr-1" /> Lưu {lines.length} câu
        </Button>
      </div>
    </div>
  );
}

function audioIsSameSong(id, p) {
  return p?.current?.id === id;
}