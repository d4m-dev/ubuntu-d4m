// src/components/home/CtaSection.jsx
import React from "react";
import { Link } from "react-router-dom";
import Reveal from "../common/Reveal";

export default function CtaSection() {
  return (
    <section id="cta-section" className="py-32 px-6 relative z-10 text-center">
      <Reveal>
        <div className="max-w-4xl mx-auto glass-card p-12 md:p-16 rounded-[3rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          
          <h2 className="text-4xl md:text-6xl font-heading font-black mb-6 relative z-10 text-white">
            Sẵn sàng bước vào <br /><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Tương lai?</span>
          </h2>
          <p className="mb-10 max-w-xl mx-auto relative z-10 text-lg text-slate-300">
            Hãy kết nối D4M ID của bạn để mở khóa toàn bộ quyền năng của hệ sinh thái và bắt đầu triển khai các dự án vượt thời đại.
          </p>
          <Link to="/hub" className="btn-glow-master px-12 py-5 text-white font-black uppercase tracking-widest rounded-2xl text-lg relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform">
            <span className="relative z-10 flex items-center gap-3">
              <span>Truy Cập Project Hub</span> <i className="fa-solid fa-arrow-right-to-bracket"></i>
            </span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}