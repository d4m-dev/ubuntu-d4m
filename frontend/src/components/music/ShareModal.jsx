import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/music/ui/dialog";
import { Button } from "@/components/music/ui/button";
import { Copy, Check, Globe, Hash, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { SHARE } from "@/config/urls";

export default function ShareModal({ open, onOpenChange, playlist }) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    if (!playlist) return "";
    return `${window.location.origin}/playlist/${playlist.id}`;
  }, [playlist]);

  if (!playlist) return null;

  const doCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for iframe / non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Đã sao chép liên kết");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const text = encodeURIComponent(`Nghe ngay "${playlist.name}" trên D4M Music Pro`);
  const enc = encodeURIComponent(url);
  const shares = [
    {
      label: "Facebook",
      icon: Globe,
      color: "bg-[#1877F2]",
      href: SHARE.FACEBOOK(url),
    },
    {
      label: "Twitter",
      icon: Hash,
      color: "bg-black",
      href: SHARE.TWITTER(url, text),
    },
    {
      label: "Telegram",
      icon: Send,
      color: "bg-[#0088cc]",
      href: SHARE.TELEGRAM(url, text),
    },
    {
      label: "Zalo",
      icon: MessageCircle,
      color: "bg-[#0068FF]",
      href: SHARE.ZALO(url, text),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121212] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Outfit" }}>Chia sẻ playlist</DialogTitle>
        </DialogHeader>

        {/* Preview card */}
        <div className="rounded-2xl overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${playlist.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(30px)",
              opacity: 0.5,
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative p-4 flex gap-3 items-center">
            <img
              src={playlist.cover_url}
              alt=""
              className="w-16 h-16 rounded-md object-cover shadow-xl shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#1ed760]">
                D4M Music Pro
              </div>
              <div className="font-bold truncate" style={{ fontFamily: "Outfit" }}>
                {playlist.name}
              </div>
              <div className="text-xs text-white/60 truncate">
                {playlist.owner} · {playlist.song_count} bài
              </div>
            </div>
          </div>
        </div>

        {/* Copy link */}
        <div className="flex gap-2 items-center">
          <input
            data-testid="share-url-input"
            readOnly
            value={url}
            className="flex-1 h-10 px-3 rounded-md bg-white/5 border border-white/10 text-sm text-white/80 truncate"
          />
          <Button
            data-testid="share-copy-btn"
            onClick={doCopy}
            className="bg-[#1ed760] hover:bg-[#1db954] text-black rounded-md"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="ml-1">{copied ? "Đã sao chép" : "Sao chép"}</span>
          </Button>
        </div>

        {/* Social */}
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">
            Chia sẻ tới
          </div>
          <div className="grid grid-cols-4 gap-2">
            {shares.map((s) => (
              <a
                key={s.label}
                data-testid={`share-${s.label.toLowerCase()}`}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.color} rounded-lg h-16 flex flex-col items-center justify-center gap-1 hover:scale-105 transition-transform`}
              >
                <s.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{s.label}</span>
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
