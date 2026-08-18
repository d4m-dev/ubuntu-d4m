// src/components/common/Toast.jsx
import React, { useEffect, useState } from "react";

export default function Toast({ toast, onClose }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;

    setIsExiting(false);
    const timer = setTimeout(() => {
      handleClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 400); // Đợi 400ms cho animation trượt ra chạy xong
  };

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const icon = isSuccess 
    ? "fa-shield-check text-green-400" 
    : "fa-triangle-exclamation text-red-400";
  const border = isSuccess 
    ? "border-green-500/30 bg-black/80" 
    : "border-red-500/30 bg-black/80";
  const glow = isSuccess 
    ? "shadow-[0_0_20px_rgba(74,222,128,0.2)]" 
    : "shadow-[0_0_20px_rgba(239,68,68,0.2)]";

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-auto">
      <div
        className={`flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border ${border} backdrop-blur-xl ${glow} min-w-[280px] transition-all duration-400 cubic-bezier(0.16, 1, 0.3, 1) ${
          isExiting 
            ? "opacity-0 translate-x-[120%]" 
            : "opacity-100 translate-x-0 animate-[toast-slide_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"
        }`}
      >
        <div className="flex items-center gap-3">
          <i className={`fa-solid ${icon} text-lg`}></i>
          <span className="text-white text-sm font-medium tracking-wide">
            {toast.message}
          </span>
        </div>
        <button 
          onClick={handleClose} 
          className="text-gray-500 hover:text-white transition-colors ml-2"
          title="Đóng"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  );
}