import { usePlayer } from "./contexts/PlayerContext";
import { useAuth } from "./contexts/AuthContext";
import { toast } from "sonner";
import {
  PlayIcon, PauseIcon, PrevIcon, NextIcon, ShuffleIcon, RepeatIcon, VolumeIcon, HeartIcon,
} from "./ui/Icons";
import { fmtDuration } from "../../lib/format";

export default function BottomPlayer() {
  const p = usePlayer();
  const { user } = useAuth();

  if (!p.current) {
    return (
      <div className="player" style={{ opacity: 0.5 }}>
        <div className="now">
          <div style={{ width: 52, height: 52, borderRadius: 6, background: "#181818" }} />
          <div className="tt">
            <div className="t">Chưa có bài hát</div>
            <div className="a">Chọn một bài hát để phát</div>
          </div>
        </div>
        <div className="controls" style={{ opacity: 0.4 }}>
          <div className="btns">
            <button className="small" aria-label="Bài trước" disabled><PrevIcon /></button>
            <button className="play" aria-label="Phát" disabled><PlayIcon /></button>
            <button className="small" aria-label="Bài tiếp" disabled><NextIcon /></button>
          </div>
          <div className="seekbar">
            <span>0:00</span>
            <div className="progress" />
            <span>0:00</span>
          </div>
        </div>
      </div>
    );
  }

  const pct = p.duration ? (p.time / p.duration) * 100 : 0;

  const onLike = async () => {
    try {
      await p.toggleLike(p.current);
      toast.success(p.current.liked ? "Đã bỏ thích" : "Đã thả tim");
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (p.audioError) {
    return (
      <div className="player" style={{ background: "#1a1010" }}>
        <div className="now">
          <img src={p.current.cover} alt={`Ảnh bìa bài hát ${p.current.title}`} style={{ filter: "grayscale(0.5)" }} />
          <div className="tt">
            <div className="t">{p.current.title}</div>
            <div className="a" style={{ color: "var(--danger)" }}>⚠️ Không thể phát file nhạc. Thử bài khác.</div>
          </div>
        </div>
        <div className="controls">
          <div className="btns">
            <button className="small" onClick={p.prev} aria-label="Bài trước"><PrevIcon /></button>
            <button className="play" onClick={p.next} aria-label="Bài tiếp"><NextIcon /></button>
          </div>
        </div>
        <div className="vol" />
      </div>
    );
  }

  return (
    <div className="player">
      {/* Bài hát hiện tại */}
      <div className="now">
        <img src={p.current.cover} alt={`Ảnh bìa bài hát ${p.current.title}`} />
        <div className="tt">
          <div className="t">{p.current.title}</div>
          <div className="a">{p.current.artist}</div>
        </div>
        <button
          className={`icon-btn ${p.current.liked ? "liked" : ""}`}
          onClick={onLike}
          style={{ color: p.current.liked ? "var(--accent)" : undefined }}
          title={p.current.liked ? "Bỏ thích" : "Thả tim"}
          aria-label={p.current.liked ? "Bỏ thích" : "Thả tim"}
          aria-pressed={p.current.liked}
        >
          <HeartIcon filled={p.current.liked} />
        </button>
      </div>

      {/* Điều khiển */}
      <div className="controls">
        <div className="btns">
          <button
            className="small"
            onClick={() => p.setShuffle(!p.shuffle)}
            style={{ color: p.shuffle ? "var(--accent)" : undefined }}
            title="Phát ngẫu nhiên"
            aria-label="Phát ngẫu nhiên"
            aria-pressed={p.shuffle}
          >
            <ShuffleIcon />
          </button>
          <button className="small" onClick={p.prev} aria-label="Bài trước"><PrevIcon /></button>
          <button className="play" onClick={p.togglePlay} aria-label={p.playing ? "Tạm dừng" : "Phát"}>
            {p.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="small" onClick={p.next} aria-label="Bài tiếp"><NextIcon /></button>
          <button
            className="small"
            onClick={() => p.setRepeat(p.repeat === "all" ? "one" : p.repeat === "one" ? "off" : "all")}
            style={{ color: p.repeat !== "off" ? "var(--accent)" : undefined }}
            title="Lặp lại"
            aria-label="Lặp lại"
            aria-pressed={p.repeat !== "off"}
          >
            <RepeatIcon />
          </button>
        </div>
        <div className="seekbar">
          <span>{fmtDuration(p.time)}</span>
          <div
            className="progress"
            role="slider"
            aria-label="Vị trí bài hát"
            aria-valuemin={0}
            aria-valuemax={Math.round(p.duration || 0)}
            aria-valuenow={Math.round(p.time || 0)}
            tabIndex={0}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              p.seek(ratio * (p.duration || 0));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") p.seek(Math.min(p.duration || 0, p.time + 5));
              else if (e.key === "ArrowLeft") p.seek(Math.max(0, p.time - 5));
            }}
          >
            <div className="fill" style={{ width: `${pct}%` }}>
              <div className="knob" />
            </div>
          </div>
          <span>{fmtDuration(p.duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="vol">
        <VolumeIcon />
        <div
          className="progress"
          role="slider"
          aria-label="Âm lượng"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(p.volume * 100)}
          tabIndex={0}
          style={{ maxWidth: 100, width: 100 }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            p.setVolume(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") p.setVolume(Math.min(1, p.volume + 0.1));
            else if (e.key === "ArrowLeft") p.setVolume(Math.max(0, p.volume - 0.1));
          }}
        >
          <div className="fill" style={{ width: `${p.volume * 100}%` }} />
        </div>
        <span style={{ color: "var(--text-faint)", fontSize: 11, minWidth: 90, textAlign: "right" }}>
          {user ? user.full_name || user.username : "Khách"}
        </span>
      </div>
    </div>
  );
}
