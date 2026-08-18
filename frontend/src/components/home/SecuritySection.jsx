// src/components/home/SecuritySection.jsx
import React from "react";
import Reveal from "../common/Reveal";

export default function SecuritySection() {
  return (
    <section id="security" className="py-24 px-6 relative z-10 bg-black/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        
        <div className="lg:w-1/2 w-full">
          <Reveal>
            <div className="relative w-full aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 rounded-full border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-[spin_10s_linear_infinite]">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent to-red-500/10 rounded-l-full"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-shield-cat text-9xl text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-110 transition-transform cursor-pointer"></i>
              </div>
            </div>
          </Reveal>
        </div>
        
        <div className="lg:w-1/2 w-full">
          <Reveal delay={150}>
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest">
              <i className="fa-solid fa-crosshairs mr-1"></i> Phòng Thủ Chủ Động
            </div>
            <h2 className="text-4xl md:text-5xl font-heading font-black mb-6 text-white">
              Khiên không gian <br /><span class="text-red-500">AEGIS Shield</span>
            </h2>
            <p className="mb-8 leading-relaxed text-lg text-slate-300">
              Hệ thống phòng ngự cấp quân sự. Theo dõi Request bằng thuật toán Cửa Sổ Trượt (Sliding Window). Tự động nhận diện và đày ải mọi nỗ lực DDOS/Spam vào hầm ngục bóng tối (Blacklist).
            </p>
            <ul className="space-y-5 text-slate-300">
              <li className="flex items-center gap-4 font-medium bg-white/5 p-3 rounded-xl border border-white/5 hover:border-red-500/30 transition">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 text-red-400 shrink-0"><i className="fa-solid fa-bolt"></i></div>
                <span>Zero-DB: Xử lý I/O siêu tốc trực tiếp trên RAM</span>
              </li>
              <li className="flex items-center gap-4 font-medium bg-white/5 p-3 rounded-xl border border-white/5 hover:border-red-500/30 transition">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 text-red-400 shrink-0"><i className="fa-solid fa-microchip"></i></div>
                <span>Phân tích siêu dữ liệu Device & Trình Duyệt sâu</span>
              </li>
              <li className="flex items-center gap-4 font-medium bg-white/5 p-3 rounded-xl border border-white/5 hover:border-red-500/30 transition">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 text-red-400 shrink-0"><i className="fa-solid fa-fingerprint"></i></div>
                <span>Kim Bài Miễn Tử (Whitelist) cho Hệ thống Lõi</span>
              </li>
            </ul>
          </Reveal>
        </div>

      </div>
    </section>
  );
}