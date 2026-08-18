// src/components/hub/CoreProjects.jsx
// 🧩 Hệ Sinh Thái Lõi — ghim tất cả trang có route trong ứng dụng
import React from "react";

const coreApps = [
  // ============ 🌐 MẠNG XÃ HỘI ============
  { name: "Social Hub", path: "/social/social-hub", desc: "Mạng xã hội Threads & tương tác", icon: "fa-solid fa-earth-asia", color: "from-rose-500 to-red-600", group: "Mạng Xã Hội", tag: "MỚI", tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { name: "Thần Số Học", path: "/social/numerology", desc: "Phân tích vận mệnh đường đời", icon: "fa-solid fa-star-and-crescent", color: "from-purple-500 to-indigo-500", group: "Mạng Xã Hội", tag: "CORE", tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { name: "Love Sync", path: "/social/venus", desc: "Đồng bộ & ghép đôi tình yêu", icon: "fa-solid fa-heart", color: "from-pink-500 to-rose-400", group: "Mạng Xã Hội", tag: "CORE", tagColor: "bg-pink-500/10 text-pink-400 border-pink-500/20" },

  // ============ 🎵 ÂM NHẠC ============
  { name: "Music Pro", path: "/music", desc: "Nghe nhạc MP4/MP3 chất lượng cao", icon: "fa-solid fa-music", color: "from-blue-600 to-cyan-500", group: "Âm Nhạc", tag: "CORE", tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { name: "Thư Viện", path: "/music/library", desc: "Quản lý playlist & kho nhạc", icon: "fa-solid fa-layer-group", color: "from-sky-500 to-blue-600", group: "Âm Nhạc", tag: "CORE", tagColor: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  { name: "Yêu Thích", path: "/music/liked", desc: "Bài hát đã thả tim", icon: "fa-solid fa-heart-circle-check", color: "from-rose-500 to-pink-500", group: "Âm Nhạc", tag: "CORE", tagColor: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { name: "Lịch Sử", path: "/music/history", desc: "Đã nghe gần đây", icon: "fa-solid fa-clock-rotate-left", color: "from-slate-500 to-gray-600", group: "Âm Nhạc", tag: "CORE", tagColor: "bg-gray-500/10 text-gray-300 border-gray-500/20" },
  { name: "Tìm Kiếm Nhạc", path: "/music/search", desc: "Tìm bài hát, nghệ sĩ, playlist", icon: "fa-solid fa-magnifying-glass", color: "from-teal-500 to-emerald-500", group: "Âm Nhạc", tag: "CORE", tagColor: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  { name: "Upload Nhạc", path: "/admin/upload-song", desc: "Tải lên bài hát 5-trong-1", icon: "fa-solid fa-cloud-arrow-up", color: "from-amber-500 to-orange-600", group: "Âm Nhạc", tag: "ADMIN", tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },

  // ============ 🛠️ CÔNG CỤ AI & TẢI VỀ ============
  { name: "YT Downloader", path: "/tools/yt-downloader", desc: "Tải MP4/MP3 tốc độ cao", icon: "fa-solid fa-play", color: "from-red-600 to-red-800", group: "Công Cụ", tag: "HOT", tagColor: "bg-red-500/10 text-red-400 border-red-500/20" },
  { name: "Tách Giọng Hát", path: "/tools/vocal-remove", desc: "Công cụ tách âm thanh AI", icon: "fa-solid fa-headphones-simple", color: "from-amber-500 to-orange-600", group: "Công Cụ", tag: "CORE", tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { name: "J.A.R.V.I.S", path: "/tools/jarvis-chat", desc: "AI Chat trợ lý ảo", icon: "fa-solid fa-robot", color: "from-cyan-500 to-blue-600", group: "Công Cụ", tag: "CORE", tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { name: "GG Driver", path: "/tools/download-ggdriver", desc: "Sao chép Google Drive siêu tốc", icon: "fa-brands fa-google-drive", color: "from-yellow-500 to-blue-500", group: "Công Cụ", tag: "CORE", tagColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  { name: "AutoCode AI", path: "/tools/autocode", desc: "Tạo code từ ảnh bằng AI", icon: "fa-solid fa-code", color: "from-emerald-500 to-teal-600", group: "Công Cụ", tag: "CORE", tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },

  // ============ 📚 HỆ THỐNG ============
  { name: "Documentation", path: "/documentation", desc: "Tài liệu hệ thống Backend", icon: "fa-solid fa-book-journal-whills", color: "from-emerald-500 to-teal-600", group: "Hệ Thống", tag: "CORE", tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { name: "Hồ Sơ", path: "/admin/profile", desc: "Quản lý tài khoản & bảo mật", icon: "fa-solid fa-user-gear", color: "from-indigo-500 to-purple-600", group: "Hệ Thống", tag: "ADMIN", tagColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
];

// Định nghĩa nhóm với icon + màu
const GROUPS = [
  { id: "Mạng Xã Hội", icon: "fa-solid fa-earth-asia", color: "text-rose-400", gradient: "from-rose-500/20 to-transparent" },
  { id: "Âm Nhạc", icon: "fa-solid fa-music", color: "text-blue-400", gradient: "from-blue-500/20 to-transparent" },
  { id: "Công Cụ", icon: "fa-solid fa-toolbox", color: "text-amber-400", gradient: "from-amber-500/20 to-transparent" },
  { id: "Hệ Thống", icon: "fa-solid fa-server", color: "text-indigo-400", gradient: "from-indigo-500/20 to-transparent" },
];

export default function CoreProjects({ searchQuery }) {
  const q = searchQuery.toLowerCase();

  const filteredGroups = GROUPS.map((g) => ({
    ...g,
    apps: coreApps.filter(
      (app) =>
        app.group === g.id &&
        (app.name.toLowerCase().includes(q) || app.desc.toLowerCase().includes(q))
    ),
  })).filter((g) => g.apps.length > 0);

  if (filteredGroups.length === 0) return null;

  return (
    <div className="space-y-16">
      {filteredGroups.map((group) => (
        <div key={group.id}>
          {/* Tiêu đề nhóm */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`h-px bg-gradient-to-r from-transparent ${group.gradient} flex-1`}></div>
            <h2 className={`text-lg font-heading font-black uppercase tracking-widest flex items-center gap-2 ${group.color}`}>
              <i className={group.icon}></i> {group.id}
            </h2>
            <div className={`h-px bg-gradient-to-r ${group.gradient.replace("to-transparent", "from-transparent")} flex-1`}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {group.apps.map((app, idx) => (
              <div key={idx} className="glass-card rounded-2xl flex flex-col p-5 group h-full hover:border-white/20 transition-all">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <i className={`${app.icon} text-white text-xl`}></i>
                </div>
                <h3 className="text-lg font-heading font-bold text-white mb-2 line-clamp-1 flex items-center gap-2">
                  {app.name}
                </h3>
                <p className="text-sm text-gray-400 mb-6 flex-grow line-clamp-2">{app.desc}</p>
                <div className="mt-auto flex justify-between items-center pt-4 border-t border-white/5">
                  <span className={`text-[10px] px-2 py-1 rounded font-bold border ${app.tagColor}`}>
                    <i className="fa-solid fa-microchip mr-1"></i>{app.tag}
                  </span>
                  <a href={app.path} className="text-sm font-bold text-white bg-white/5 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                    Mở <i className="fa-solid fa-arrow-right text-xs"></i>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
