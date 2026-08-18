import { usePlayer } from "@/components/music/contexts/PlayerContext";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/music/ui/popover";
import { Button } from "@/components/music/ui/button";
import { toast } from "sonner";

const PRESETS = {
  Flat: [0, 0, 0, 0, 0],
  "Bass Boost": [8, 6, 2, 0, 0],
  Vocal: [-2, -1, 4, 3, 0],
  Treble: [0, 0, 0, 4, 7],
  Pop: [3, 2, 0, 3, 4],
  EDM: [7, 4, 0, 3, 6],
  Karaoke: [3, 0, -8, 0, 3], // giảm dải giữa (giọng)
  Acoustic: [4, 2, 3, 2, 3],
  "Late Night": [3, 2, 1, 1, 0],
};

const LABELS = ["60Hz", "250Hz", "1kHz", "4kHz", "12kHz"];

export default function EqualizerButton() {
  const p = usePlayer();
  const active = p.eqPreset !== "Flat" || p.eqGains.some((g) => g !== 0);

  const setBand = (i, val) => {
    const next = p.eqGains.slice();
    next[i] = val;
    p.setEq(next, "Custom");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-testid="eq-btn"
          className={`p-2 rounded-full hover:bg-white/10 ${active ? "text-[#1ed760]" : "text-white/70"}`}
          aria-label="Equalizer"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-[#181818] border-white/10 text-white w-80 p-4"
        align="end"
        sideOffset={12}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
              <SlidersHorizontal className="w-4 h-4 text-[#1ed760]" /> Equalizer
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">
              {p.eqPreset}
            </div>
          </div>
          <button
            data-testid="eq-reset"
            onClick={() => {
              p.setEq([0, 0, 0, 0, 0], "Flat");
              toast.success("Đã reset EQ");
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white/70"
            aria-label="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(PRESETS).map(([name, gains]) => (
            <button
              key={name}
              data-testid={`eq-preset-${name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => {
                p.setEq(gains, name);
                toast.success(`EQ: ${name}`);
              }}
              className={`text-[11px] px-2.5 h-7 rounded-full border transition-colors ${
                p.eqPreset === name
                  ? "bg-[#1ed760] text-black border-[#1ed760]"
                  : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="flex justify-between gap-2">
          {p.eqBands.map((freq, i) => (
            <div key={freq} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-[10px] text-white/60 tabular-nums">
                {p.eqGains[i] > 0 ? "+" : ""}
                {p.eqGains[i].toFixed(1)}
              </span>
              <input
                data-testid={`eq-band-${i}`}
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={p.eqGains[i]}
                onChange={(e) => setBand(i, parseFloat(e.target.value))}
                className="h-32"
                style={{
                  writingMode: "vertical-lr",
                  WebkitAppearance: "slider-vertical",
                  appearance: "slider-vertical",
                  width: 24,
                }}
                aria-label={`Band ${LABELS[i]}`}
              />
              <span className="text-[10px] text-white/60">{LABELS[i]}</span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-white/40 mt-3 text-center">
          Cài đặt được lưu tự động
        </div>
      </PopoverContent>
    </Popover>
  );
}
