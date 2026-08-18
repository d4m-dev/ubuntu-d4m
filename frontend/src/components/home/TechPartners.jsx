// src/components/home/TechPartners.jsx
import React from "react";

export default function TechPartners() {
  return (
    <div className="max-w-7xl mx-auto px-6 mb-24 z-10 relative">
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="text-xs font-extrabold tracking-widest text-slate-400 uppercase whitespace-nowrap">
          ĐƯỢC TIN DÙNG BỞI CÁC CÔNG NGHỆ LÕI
        </span>
        <div className="flex flex-wrap justify-center md:justify-end items-center gap-8 md:gap-12 text-slate-600 font-bold text-base grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
          <span className="flex items-center gap-2 hover:text-blue-600 transition"><i className="fa-brands fa-python text-xl"></i> Python 3.12</span>
          <span className="flex items-center gap-2 hover:text-emerald-600 transition"><i className="fa-brands fa-node-js text-xl"></i> Node.js</span>
          <span className="flex items-center gap-2 hover:text-purple-600 transition"><i class="fa-solid fa-brain text-xl"></i> Claude AI</span>
          <span className="flex items-center gap-2 hover:text-orange-600 transition"><i className="fa-brands fa-html5 text-xl"></i> Tailwind v4</span>
          <span className="flex items-center gap-2 hover:text-red-600 transition"><i className="fa-solid fa-shield-cat text-xl"></i> Aegis WAF</span>
        </div>
      </div>
    </div>
  );
}