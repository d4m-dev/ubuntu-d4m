// src/pages/music/D4MusicPlayer.jsx
// ============================================================
// 🎵 MUSIC PRO ULTIMATE — embed NGUYÊN BẢN bộ code vanilla của Sếp vào React.
// • Giao diện + toàn bộ chức năng: GIỮ Y HỆT (ui/audio/events/lyrics/other/utils/auth)
// • Dữ liệu: helpers.js tự fetch /api/music/list + stream/lyrics backend (không đổi)
// • BỔ SUNG của D4M: tracking.js (lượt nghe/tải), playlists.js (id slug theo tên bài)
// • URL: helper dùng đường dẫn tương đối /api/... (proxy vite/nginx giữ nguyên)
// ============================================================
import React, { useEffect, useRef } from "react";
import "./styles.css";
// Thứ tự import = thứ tự <script> gốc để các module bám đúng prototype
import "./helpers.js";
import "./tracking.js";
import "./playlists.js";
import "./ui.js";
import "./audio.js";
import "./events.js";
import "./utils.js";
import "./auth.js";
import "./lyrics.js";
import "./other.js";
import MusicPro from "./MusicProCore.js";
import { MUSIC_PRO_HTML } from "./musicProHtml.js";

export default function D4MusicPlayer() {
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      window.app = new MusicPro(); // boot cỗ máy vanilla sau khi DOM React sẵn sàng
      booted.current = true;
    }
    // 🧹 Rời trang: ngắt âm thanh, không rò rỉ
    return () => {
      try {
        window.app?.audio?.pause();
        window.app?.beatAudio?.pause();
        window.app?.video?.pause?.();
      } catch (e) { /* noop */ }
    };
  }, []);

  // Markup nguyên bản (static, không chứa input người dùng)
  return <div dangerouslySetInnerHTML={{ __html: MUSIC_PRO_HTML }} />;
}
