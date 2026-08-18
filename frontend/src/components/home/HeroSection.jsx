// src/components/home/HeroSection.jsx
import React from "react";
import { Link } from "react-router-dom";
import TerminalWindow from "./TerminalWindow";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 px-6 z-10 min-h-[90vh] flex items-center">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        <div className="text-left">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-100 text-xs font-bold uppercase tracking-widest backdrop-blur-md animate-pulse">
            <i className="fa-solid fa-rocket text-yellow-400 mr-2"></i> Kỷ nguyên mới của Serverless
          </div>
          
          <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter drop-shadow-2xl mb-6 leading-[1.1]">
            Định hình lại <br />
            <span className="shine-text">Không Gian Sáng Tạo</span>
          </h1>
          
          <p className="text-base md:text-lg max-w-xl leading-relaxed mb-10 font-medium text-slate-300">
            Một hệ sinh thái đa chiều, nơi hợp nhất sức mạnh của AI, tự động hóa vạn vật và tường lửa bất khả xâm phạm. Dành riêng cho những bộ óc kiệt xuất.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <Link to="/hub" className="btn-glow-master px-10 py-4 text-white font-bold rounded-xl text-lg tracking-wide group shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transition-all">
              <span className="relative z-10 flex items-center gap-2">
                <span>Khám Phá Ecosystem</span> <i className="fa-solid fa-satellite-dish group-hover:rotate-12 transition-transform"></i>
              </span>
            </Link>
            <a href="#features" className="px-8 py-4 font-bold rounded-xl text-lg hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-slate-300">
              <span>Tìm hiểu thêm</span> <i className="fa-solid fa-chevron-down text-sm"></i>
            </a>
          </div>
        </div>

        <div className="relative hidden md:block pl-10">
          <TerminalWindow />
        </div>

      </div>
    </section>
  );
}