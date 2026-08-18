// src/components/home/TerminalWindow.jsx
import React, { useState, useEffect } from "react";

const commands = [
  { text: "ssh root@d4m-cloud", delay: 600, color: "text-gray-300" },
  { text: "Authenticated successfully.", delay: 200, color: "text-green-400" },
  { text: "", delay: 100, color: "" },
  { text: "> initializing aegis-shield...", delay: 400, color: "text-gray-400" },
  { text: "[OK] Radar protection active. Listening on all ports.", delay: 300, color: "text-blue-400" },
  { text: "> python scripts/fcc.py --mode=god", delay: 600, color: "text-yellow-400" },
  { text: "⏳ Bypassing network limits...", delay: 400, color: "text-gray-400" },
  { text: "✅ fcc-server mapped to PORT 22424", delay: 200, color: "text-green-400" },
  { text: "🧠 Claude AI connected. Workspace ready.", delay: 500, color: "text-purple-400 font-bold" }
];

export default function TerminalWindow() {
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState({ text: "", color: "" });

  useEffect(() => {
    let isMounted = true;

    const runTerminal = async () => {
      for (let cmd of commands) {
        if (!isMounted) return;

        // Nếu lệnh bắt đầu bằng "> " hoặc "ssh" thì làm hiệu ứng gõ từng ký tự
        if (cmd.text.startsWith("> ") || cmd.text.startsWith("ssh")) {
          setCurrentLine({ text: "", color: cmd.color });
          let accumulated = "";
          for (let char of cmd.text) {
            if (!isMounted) return;
            accumulated += char;
            setCurrentLine({ text: accumulated, color: cmd.color });
            await new Promise((r) => setTimeout(r, Math.random() * 25 + 15));
          }
          setLines((prev) => [...prev, { text: cmd.text, color: cmd.color }]);
          setCurrentLine({ text: "", color: "" });
        } else {
          // Các dòng phản hồi hệ thống in ra ngay
          setLines((prev) => [...prev, { text: cmd.text, color: cmd.color }]);
        }
        await new Promise((r) => setTimeout(r, cmd.delay));
      }
    };

    const timeoutId = setTimeout(runTerminal, 800);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="terminal-window rounded-2xl overflow-hidden w-full max-w-lg mx-auto aspect-[4/3] flex flex-col">
      <div className="bg-black/50 border-b border-white/10 p-3 flex items-center px-4">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_#f59e0b]"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_#10b981]"></div>
        </div>
        <div className="mx-auto text-[10px] text-gray-400 font-mono flex items-center gap-2">
          <i className="fa-solid fa-lock text-gray-500"></i> root@d4m-cloud:~
        </div>
      </div>
      <div className="p-6 font-mono text-sm flex-1 leading-relaxed relative overflow-hidden text-left">
        {lines.map((l, idx) => (
          <div key={idx} className={`mb-1 ${l.color}`}>
            {l.text}
          </div>
        ))}
        {currentLine.text && (
          <div className={`mb-1 inline-block ${currentLine.color}`}>
            {currentLine.text}
          </div>
        )}
        <span className="cursor inline-block w-2 h-4 bg-blue-500 ml-1 align-middle"></span>
      </div>
    </div>
  );
}