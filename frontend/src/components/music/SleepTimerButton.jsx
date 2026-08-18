import { usePlayer } from "@/components/music/contexts/PlayerContext";
import { Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/music/ui/dropdown-menu";
import { toast } from "sonner";

const OPTIONS = [
  { label: "5 phút", minutes: 5 },
  { label: "15 phút", minutes: 15 },
  { label: "30 phút", minutes: 30 },
  { label: "45 phút", minutes: 45 },
  { label: "1 giờ", minutes: 60 },
];

function formatCountdown(ms) {
  if (ms <= 0) return "";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SleepTimerButton() {
  const p = usePlayer();
  const active = !!p.sleepEndAt || p.sleepEndOfTrack;
  const label = p.sleepEndOfTrack ? "Kết thúc bài" : formatCountdown(p.remainingMs);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="sleep-timer-btn"
          className={`relative p-2 rounded-full hover:bg-white/10 flex items-center gap-1 ${
            active ? "text-[#1ed760]" : "text-white/70"
          }`}
          aria-label="Hẹn giờ tắt"
        >
          <Moon className="w-4 h-4" />
          {active && (
            <span className="text-[10px] tabular-nums font-semibold">
              {label}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#181818] border-white/10 text-white min-w-[220px]"
      >
        <DropdownMenuLabel className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-[#1ed760]" /> Hẹn giờ tắt nhạc
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {active && (
          <>
            <DropdownMenuItem
              data-testid="sleep-cancel"
              onClick={() => {
                p.startSleepTimer(null);
                toast.success("Đã tắt hẹn giờ");
              }}
              className="cursor-pointer text-red-400"
            >
              Tắt hẹn giờ ({label})
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
          </>
        )}
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.minutes}
            data-testid={`sleep-${o.minutes}`}
            onClick={() => {
              p.startSleepTimer(o.minutes);
              toast.success(`Sẽ tắt nhạc sau ${o.label}`);
            }}
            className="cursor-pointer"
          >
            {o.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          data-testid="sleep-end-of-track"
          onClick={() => {
            p.startSleepTimer("end");
            toast.success("Sẽ dừng sau khi hết bài hiện tại");
          }}
          className="cursor-pointer"
        >
          Kết thúc bài hiện tại
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
