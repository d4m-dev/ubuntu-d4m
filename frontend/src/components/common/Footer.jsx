// src/components/common/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer 
      className="py-10 border-t border-white/5 bg-black/80 backdrop-blur-3xl relative z-40 mt-auto" 
      aria-label="Chân trang"
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* LOGO & CUỘN LÊN ĐẦU TRANG */}
        <a 
          href="#" 
          onClick={scrollToTop} 
          className="flex items-center gap-3 cursor-pointer group" 
          aria-label="D4M.Cloud - Cuộn lên đầu trang"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-cloud text-white text-xs" aria-hidden="true"></i>
          </div>
          <span className="font-heading font-bold text-lg tracking-wide text-white">
            D4M<span className="text-gray-400">.Cloud</span>
          </span>
        </a>

        {/* COPYRIGHT & CRAFTED WITH BOLT */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <span>
            © 2026 Crafted with{" "}
            <i 
              className="fa-solid fa-bolt text-yellow-500 mx-1 animate-pulse" 
              aria-hidden="true"
            ></i>{" "}
            by <strong className="text-white">d4m-dev</strong>
          </span>
        </div>

        {/* ADMIN QUICK ACCESS BUTTONS */}
        <div className="flex gap-4">
          <Link 
            to="/admin/admin-dashboard" 
            aria-label="Bảng Điều Khiển Lõi" 
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 flex items-center justify-center transition border border-transparent hover:border-blue-500/30 shadow-sm" 
            title="Bảng Điều Khiển Lõi"
          >
            <i className="fa-solid fa-microchip" aria-hidden="true"></i>
          </Link>
          
          <Link 
            to="/admin/admin-scripts" 
            aria-label="Phòng Điều Hành Cron" 
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-400 flex items-center justify-center transition border border-transparent hover:border-purple-500/30 shadow-sm" 
            title="Phòng Điều Hành Cron"
          >
            <i className="fa-solid fa-terminal" aria-hidden="true"></i>
          </Link>
          
          <Link 
            to="/admin/admin-security" 
            aria-label="Phòng Điều Hành Aegis" 
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex items-center justify-center transition border border-transparent hover:border-red-500/30 shadow-sm" 
            title="Phòng Điều Hành Aegis"
          >
            <i className="fa-solid fa-shield-cat" aria-hidden="true"></i>
          </Link>
        </div>

      </div>
    </footer>
  );
}