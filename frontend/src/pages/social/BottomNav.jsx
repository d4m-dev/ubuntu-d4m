// src/pages/social/BottomNav.jsx
// 📱 Thanh điều hướng đáy (Threads style) — dùng chung
// Được nhúng vào SocialHubPage VÀ các panel (DM, Hoạt động, Cá nhân hóa)
// với z-index rất cao (z-[100]) để LUÔN hiển thị trên mọi phần chức năng.
import { IconHome, IconMessage, IconPlus, IconHeart } from "./icons";
import AvatarFrame from "./AvatarFrame";

export default function BottomNav({ active, dmUnread = 0, avatarUrl, frame, pet, treasure, onNavigate }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-[640px] mx-auto flex items-center justify-around py-3 text-gray-400">
        {/* Home */}
        <button
          onClick={() => onNavigate("home")}
          className={`p-1 ${active ? "text-white" : "hover:text-gray-200"}`}
          title="Trang chủ"
          style={{ width: 24, height: 24 }}
        ><IconHome /></button>

        {/* Tin nhắn */}
        <button
          onClick={() => onNavigate("dm")}
          className="p-1 relative hover:text-gray-200"
          title="Tin nhắn"
          style={{ width: 24, height: 24 }}
        >
          <IconMessage />
          {dmUnread > 0 && (
            <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#1ed760] text-black text-[10px] font-bold flex items-center justify-center">
              {dmUnread > 99 ? "99+" : dmUnread}
            </span>
          )}
        </button>

        {/* Tạo bài */}
        <button
          onClick={() => onNavigate("create")}
          className="p-1 text-white hover:text-gray-200"
          title="Tạo bài"
          style={{ width: 26, height: 26 }}
        ><IconPlus /></button>

        {/* Hoạt động */}
        <button
          onClick={() => onNavigate("activity")}
          className="p-1 hover:text-gray-200"
          title="Hoạt động"
          style={{ width: 24, height: 24 }}
        ><IconHeart /></button>

        {/* Hồ sơ — mở bảng Hồ sơ & Phong cách */}
        <button onClick={() => onNavigate("profile")} className="p-1 hover:text-gray-200" title="Hồ sơ & Phong cách">
          <AvatarFrame src={avatarUrl} frame={frame} pet={pet} treasure={treasure} size={26} alt="" />
        </button>
      </div>
    </nav>
  );
}
