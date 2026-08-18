import { useState } from "react";
import { usePlayer, formatTime } from "@/components/music/contexts/PlayerContext";
import { X, GripVertical, Play, Pause, Trash2, ListMusic } from "lucide-react";
import { Sheet, SheetContent } from "@/components/music/ui/sheet";

export default function QueuePanel({ open, onOpenChange }) {
  const p = usePlayer();
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const onDragStart = (i) => (e) => {
    setDragIdx(i);
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires data
    e.dataTransfer.setData("text/plain", String(i));
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    setOverIdx(i);
  };
  const onDrop = (i) => (e) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) p.moveInQueue(dragIdx, i);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const upcoming = p.queue
    .map((s, i) => ({ s, i }))
    .filter(({ i }) => i > p.index);
  const current = p.current;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-[#121212] border-white/10 text-white w-full sm:max-w-md p-0 flex flex-col"
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
              <ListMusic className="w-5 h-5" /> Danh sách phát
            </h2>
            <p className="text-xs text-white/50 mt-1">
              {p.queue.length} bài — kéo thả để sắp xếp lại
            </p>
          </div>
          <button
            data-testid="close-queue-btn"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {current && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/50 px-2 mb-2">
                Đang phát
              </div>
              <div className="flex items-center gap-3 p-2 rounded-md bg-white/[0.04] mb-4">
                <img src={current.cover_url} alt="" className="w-11 h-11 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#1ed760]">{current.title}</div>
                  <div className="truncate text-xs text-white/60">{current.artist}</div>
                </div>
                <button
                  data-testid="queue-toggle-current"
                  onClick={p.toggle}
                  aria-label="Play/Pause"
                  className="p-2 rounded-full hover:bg-white/10"
                >
                  {p.isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="text-[10px] uppercase tracking-widest text-white/50 px-2 mb-2">
            Kế tiếp ({upcoming.length})
          </div>
          {upcoming.length === 0 && (
            <div className="text-center text-white/40 py-10 text-sm">
              Không còn bài nào trong hàng chờ
            </div>
          )}
          <div className="space-y-1">
            {upcoming.map(({ s, i }) => (
              <div
                key={`${s.id}-${i}`}
                data-testid={`queue-item-${s.id}`}
                draggable
                onDragStart={onDragStart(i)}
                onDragOver={onDragOver(i)}
                onDrop={onDrop(i)}
                onDragEnd={onDragEnd}
                className={`group flex items-center gap-2 p-2 rounded-md hover:bg-white/[0.05] transition-colors cursor-move ${
                  dragIdx === i ? "opacity-50" : ""
                } ${overIdx === i && dragIdx !== i ? "border-t-2 border-[#1ed760]" : "border-t-2 border-transparent"}`}
              >
                <GripVertical className="w-4 h-4 text-white/40 shrink-0" />
                <img src={s.cover_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                <button
                  data-testid={`queue-play-${s.id}`}
                  onClick={() => p.jumpTo(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm">{s.title}</div>
                  <div className="truncate text-xs text-white/60">{s.artist}</div>
                </button>
                <span className="text-[11px] text-white/40 tabular-nums shrink-0">
                  {formatTime(s.duration)}
                </span>
                <button
                  data-testid={`queue-remove-${s.id}`}
                  onClick={() => p.removeFromQueue(i)}
                  aria-label="Xoá"
                  className="p-1.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-white/70" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
