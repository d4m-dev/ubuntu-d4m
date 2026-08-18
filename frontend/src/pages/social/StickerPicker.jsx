// src/pages/social/StickerPicker.jsx
// 🎨 Bảng chọn sticker GIF — dùng chung cho bài đăng và bình luận
// - Tab "Sticker": bộ sticker gốc D4M + GIF upload trên site (nằm trong images_workspace/social_stickers)
// - Tab "GIPHY": tìm kiếm sticker/GIF từ GIPHY (chỉ hiện khi có VITE_GIPHY_API_KEY)
import { useEffect, useRef, useState } from "react";
import { SOCIAL } from "../../config/urls";
import { getToken } from "../../services/api";

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || "";
const GIPHY_SEARCH = "https://api.giphy.com/v1/gifs/search";
const GIPHY_TRENDING = "https://api.giphy.com/v1/gifs/trending";

export default function StickerPicker({ onSelect, onClose }) {
  const [stickers, setStickers] = useState([]);
  const [tab, setTab] = useState("sticker");
  const [gifs, setGifs] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  const authHeaders = () => {
    const t = getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${t}` };
  };

  // Tải sticker từ backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(SOCIAL.STICKERS, { headers: authHeaders() });
        const data = await res.json();
        setStickers(data.data || []);
      } catch (e) { setStickers([]); }
    })();
  }, []);

  // Tải GIPHY
  useEffect(() => {
    if (tab !== "giphy" || !GIPHY_KEY) return;
    setLoading(true);
    const url = q
      ? `${GIPHY_SEARCH}?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
      : `${GIPHY_TRENDING}?api_key=${GIPHY_KEY}&limit=24&rating=g`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setGifs(d.data || []))
      .catch(() => setGifs([]))
      .finally(() => setLoading(false));
  }, [tab, q]);

  return (
    <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-72">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab("sticker")}
          className={`flex-1 py-2 text-xs font-semibold ${tab === "sticker" ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
        >Sticker</button>
        {GIPHY_KEY && (
          <button
            onClick={() => setTab("giphy")}
            className={`flex-1 py-2 text-xs font-semibold ${tab === "giphy" ? "text-white bg-white/5" : "text-gray-500 hover:text-gray-300"}`}
          >GIPHY</button>
        )}
      </div>

      {/* GIPHY search */}
      {tab === "giphy" && (
        <div className="p-2 border-b border-white/10">
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm sticker GIF..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
          />
        </div>
      )}

      {/* Grid */}
      <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-4 gap-1">
        {tab === "sticker" ? (
          stickers.length === 0 ? (
            <div className="col-span-4 text-center text-gray-500 text-xs py-6">Không có sticker.</div>
          ) : (
            stickers.map((s) => (
              <button
                key={s.name}
                onClick={() => onSelect(s.url)}
                className="aspect-square rounded-lg hover:bg-white/10 overflow-hidden"
                title={s.name}
              >
                <img src={SOCIAL.STICKER_FILE(s.name)} alt={`Sticker ${s.name}`} loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))
          )
        ) : loading ? (
          <div className="col-span-4 text-center text-gray-500 text-xs py-6">Đang tải...</div>
        ) : gifs.length === 0 ? (
          <div className="col-span-4 text-center text-gray-500 text-xs py-6">
            {GIPHY_KEY ? "Không tìm thấy." : "Cần VITE_GIPHY_API_KEY để dùng GIPHY."}
          </div>
        ) : (
          gifs.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelect(g.images?.fixed_width_small?.url)}
              className="aspect-square rounded-lg hover:bg-white/10 overflow-hidden"
              title={g.title}
            >
              <img src={g.images?.fixed_width_small?.url} alt={g.title || "GIF"} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
