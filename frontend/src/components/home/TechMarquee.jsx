// src/components/home/TechMarquee.jsx
import React from "react";

const techItems = [
  { icon: "fa-brands fa-python text-blue-400", name: "Python 3.12" },
  { icon: "fa-solid fa-bolt text-yellow-400", name: "FastAPI" },
  { icon: "fa-brands fa-node-js text-green-500", name: "Node.js" },
  { icon: "fa-brands fa-html5 text-orange-500", name: "HTML5/Tailwind" },
  { icon: "fa-solid fa-brain text-purple-400", name: "Claude AI System" },
  { icon: "fa-solid fa-shield-cat text-red-400", name: "Aegis Shield" },
  { icon: "fa-solid fa-stopwatch text-teal-400", name: "Async Cronjobs" },
  { icon: "fa-brands fa-github text-white", name: "GitHub Sync" }
];

export default function TechMarquee() {
  return (
    <div className="border-y border-white/5 bg-black/40 backdrop-blur-sm relative z-10 overflow-hidden">
      <div className="marquee-wrapper max-w-7xl mx-auto">
        <div className="marquee-content">
          {/* Lặp lại 2 lần mảng techItems để tạo vòng lặp vô tận không bị ngắt quãng */}
          {[...techItems, ...techItems].map((item, index) => (
            <div key={index} className="marquee-item text-slate-200">
              <i className={item.icon}></i> {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}