// src/components/hub/UserProjects.jsx
import React from "react";
import { API_BASE_URL } from "../../config/api";

export default function UserProjects({ projects, loading, error, searchQuery, isAuthenticated }) {
  
  // 1. CHƯA ĐĂNG NHẬP -> HIỂN THỊ YÊU CẦU XÁC THỰC
  if (!isAuthenticated) {
    return (
      <div className="mt-12 p-10 glass-card rounded-3xl border border-white/10 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-16 h-16 mx-auto bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 border border-gray-700 shadow-inner">
          <i className="fa-solid fa-lock text-3xl text-gray-500"></i>
        </div>
        <h2 className="text-xl font-heading font-black text-white mb-2">Không Gian Lưu Trữ Đóng Băng</h2>
        <p className="text-sm text-gray-400 font-mono">
          Vui lòng Xác Thực D4M ID để mở khóa danh sách Hosted Projects của sếp.
        </p>
      </div>
    );
  }

  // 2. ĐANG TẢI DỮ LIỆU
  if (loading) {
    return (
      <div className="mt-12 py-16 text-center">
        <i className="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"></i>
        <p className="text-sm font-bold text-gray-400 font-mono uppercase tracking-widest">
          Đang quét vệ tinh dữ liệu...
        </p>
      </div>
    );
  }

  // 3. NẾU CÓ LỖI TỪ API
  if (error) {
    return (
      <div className="mt-12 p-8 glass-card bg-red-950/20 border border-red-500/30 rounded-3xl text-center">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i>
        <h2 className="text-lg font-bold text-red-400 mb-2">Lỗi Truy Xuất</h2>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  // 4. LỌC DỰ ÁN THEO THANH TÌM KIẾM CỦA HUBPAGE
  const filteredProjects = (projects || []).filter((p) =>
    (p.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className="mt-12 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <i className="fa-solid fa-server text-blue-400 text-sm"></i>
        </div>
        <h2 className="text-2xl font-heading font-black text-white tracking-wide">
          HOSTED <span className="text-blue-400">PROJECTS</span>
        </h2>
        <span className="ml-auto text-xs font-mono font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full text-gray-400">
          {filteredProjects.length} Ứng dụng
        </span>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="p-10 border-2 border-dashed border-gray-700/50 rounded-3xl text-center bg-black/20">
          <i className="fa-regular fa-folder-open text-4xl text-gray-600 mb-4"></i>
          <p className="text-sm font-bold text-gray-400">Không tìm thấy dự án nào phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, idx) => (
            <a
              key={idx}
              href={`${API_BASE_URL}/projects/${project.name}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-6 rounded-3xl border border-white/10 hover:border-blue-500/50 transition-all duration-300 group block relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
              
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <i className="fa-solid fa-globe text-2xl text-gray-400 group-hover:text-blue-400 transition-colors"></i>
                </div>
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> ONLINE
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1.5 truncate group-hover:text-blue-400 transition-colors">
                {project.name}
              </h3>
              <p className="text-xs font-mono text-gray-500 truncate flex items-center gap-1.5">
                <i className="fa-solid fa-link text-[10px]"></i> {`${API_BASE_URL}/projects/${project.name}`}
              </p>
              
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold group-hover:text-white transition-colors">Mở ứng dụng</span>
                <i className="fa-solid fa-arrow-right text-gray-600 text-sm group-hover:translate-x-1 group-hover:text-blue-400 transition-all"></i>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}