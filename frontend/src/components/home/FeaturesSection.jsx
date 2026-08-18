// src/components/home/FeaturesSection.jsx
import React from "react";
import Reveal from "../common/Reveal";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-heading font-black mb-4 text-white">
            Sức mạnh Lõi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">D4M Matrix</span>
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400">
            Kiến trúc vi dịch vụ kết hợp năng lực tính toán cực đại, mang đến trải nghiệm vận hành không rào cản.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Reveal delay={0}>
            <div className="glass-card p-8 rounded-3xl h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.4)] text-white text-2xl">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Tốc độ Ánh sáng</h3>
              <p className="leading-relaxed text-sm text-slate-400">Triển khai dự án HTML5/Python tức thì. Hệ thống định tuyến nội bộ thông minh giúp giảm độ trễ về con số 0 tuyệt đối.</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="glass-card p-8 rounded-3xl h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(168,85,247,0.4)] text-white text-2xl">
                <i className="fa-solid fa-brain"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Trí Tuệ Claude AI</h3>
              <p className="leading-relaxed text-sm text-slate-400">Tích hợp sâu môi trường Free Claude Code (FCC). Lập trình, sửa lỗi và thao tác qua Terminal bằng ngôn ngữ tự nhiên.</p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="glass-card p-8 rounded-3xl h-full">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-white text-2xl">
                <i className="fa-solid fa-stopwatch"></i>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Tự Động Hóa Cron</h3>
              <p className="leading-relaxed text-sm text-slate-400">Máy biên dịch thời gian chuẩn xác. Lên kịch bản vận hành ngầm, truyền tham số động và bỏ qua giới hạn tương tác.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}