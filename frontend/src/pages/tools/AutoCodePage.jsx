// src/pages/tools/AutoCodePage.jsx
import React, { useState, useEffect, useRef } from "react";
// NOTE: highlight.js được import động trong analyzeCodeAndSetTab
// (chỉ tải khi người dùng tạo code) — giữ trang /tools/autocode nhẹ khi mở.
import { Link } from "react-router-dom";

import { ENDPOINTS } from "../../config/api";
import ConfigWarning from "../../components/common/ConfigWarning";
import { showToast } from "../../lib/toast";

// Danh sách trạng thái lúc AI quét ảnh
const SCAN_MESSAGES = [
  "Đang bóc tách Cấu trúc DOM...",
  "Đang phân tích Bảng màu & Typography...",
  "Đang dịch ngược giao diện sang Code...",
  "Đang tối ưu hóa UI/UX...",
  "Sắp xong rồi sếp, đang làm sạch mã nguồn...",
];

export default function AutoCodePage() {
  // =================================================================
  // 1. STATE QUẢN LÝ
  // =================================================================

  const [authStatus, setAuthStatus] = useState("checking"); // 'checking' | 'ok' | 'error'
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");

  // Input Data
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [prompt, setPrompt] = useState("");

  // Trạng thái AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [scanMsgIndex, setScanMsgIndex] = useState(0);

  // Kết quả
  const [generatedCode, setGeneratedCode] = useState("");
  const [detectedLang, setDetectedLang] = useState("html");
  const [fileTab, setFileTab] = useState({
    name: "snippet",
    ext: "txt",
    icon: "fa-solid fa-file-code text-gray-400",
    isRenderable: false,
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const codeRef = useRef(null);

  // =================================================================
  // 2. KHỞI TẠO & KẾT NỐI API
  // =================================================================


  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    if (!token) {
      window.location.href = `/auth?redirect=/tools/autocode`;
      return;
    }

    const fetchModels = async () => {
      try {
        const res = await fetch(ENDPOINTS.AUTOCODE.MODELS, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Hết phiên đăng nhập hoặc Lỗi API");
        const data = await res.json();

        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].name);
        }
        setAuthStatus("ok");
      } catch (err) {
        setAuthStatus("error");
        showToast("Lỗi bảo mật: Vui lòng đăng xuất & đăng nhập lại.", "error");
      }
    };

    fetchModels();
  }, []);

  // Vòng lặp đổi chữ khi Scanner đang quét
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setScanMsgIndex((prev) => (prev + 1) % SCAN_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // =================================================================
  // 3. XỬ LÝ FILE (Kéo/Thả, Chọn)
  // =================================================================
  const handleFile = (selectedFile) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      showToast("Vui lòng chọn file hình ảnh hợp lệ!", "error");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl("");
  };

  // =================================================================
  // 4. TIẾN TRÌNH GENERATE MÃ NGUỒN
  // =================================================================
  const analyzeCodeAndSetTab = async (codeStr) => {
    let ext = "html";
    let fileName = "index";
    let iconClass = "fa-brands fa-html5 text-orange-500";
    let renderable = true;

    // Phân tích Highlight.js để lấy class ngôn ngữ
    if (codeRef.current) {
      // Chỉ tải highlight.js khi thực sự có code cần tô màu
      const hljs = await import("highlight.js");
      await import("highlight.js/styles/atom-one-dark.min.css");
      delete codeRef.current.dataset.highlighted;
      hljs.highlightElement(codeRef.current);
      
      const classList = Array.from(codeRef.current.classList);
      const langClass = classList.find((c) => c.startsWith("language-"));
      const parsedLang = langClass ? langClass.replace("language-", "") : "html";
      setDetectedLang(parsedLang);

      const langMap = {
        xml: { ext: "html", icon: "fa-brands fa-html5 text-orange-500", render: true },
        html: { ext: "html", icon: "fa-brands fa-html5 text-orange-500", render: true },
        javascript: { ext: "js", icon: "fa-brands fa-square-js text-yellow-400", name: "script", render: false },
        js: { ext: "js", icon: "fa-brands fa-square-js text-yellow-400", name: "script", render: false },
        typescript: { ext: "ts", icon: "fa-solid fa-file-code text-blue-400", name: "app", render: false },
        python: { ext: "py", icon: "fa-brands fa-python text-blue-500", name: "main", render: false },
        css: { ext: "css", icon: "fa-brands fa-css3-alt text-blue-400", name: "style", render: false },
        json: { ext: "json", icon: "fa-solid fa-code text-gray-400", name: "data", render: false },
        php: { ext: "php", icon: "fa-brands fa-php text-purple-400", name: "index", render: false },
        java: { ext: "java", icon: "fa-brands fa-java text-red-500", name: "Main", render: false },
        cpp: { ext: "cpp", icon: "fa-solid fa-file-code text-blue-600", name: "main", render: false },
        bash: { ext: "sh", icon: "fa-solid fa-terminal text-green-400", name: "script", render: false },
      };

      if (langMap[parsedLang]) {
        ext = langMap[parsedLang].ext;
        iconClass = langMap[parsedLang].icon;
        renderable = langMap[parsedLang].render;
        if (langMap[parsedLang].name) fileName = langMap[parsedLang].name;
      } else {
        ext = "txt";
        fileName = "snippet";
        iconClass = "fa-solid fa-file-code text-gray-400";
        renderable = false;
      }

      // ⚡ SIÊU NHẬN DIỆN FRAMEWORK (REACT)
      if (
        (parsedLang === "javascript" || parsedLang === "typescript" || parsedLang === "xml") &&
        (codeStr.includes("React") || codeStr.includes("import React") || codeStr.includes("className="))
      ) {
        ext = parsedLang === "typescript" || codeStr.includes("interface ") || codeStr.includes("type ") ? "tsx" : "jsx";
        fileName = "App";
        iconClass = "fa-brands fa-react text-cyan-400 animate-[spin_4s_linear_infinite]";
        renderable = false;
      }
    }

    setFileTab({ name: fileName, ext, icon: iconClass, isRenderable: renderable });

    // Khóa preview nếu không phải HTML
    if (!renderable && isPreviewMode) {
      setIsPreviewMode(false);
    }
  };

  const handleGenerate = async () => {
    if (!file) return showToast("Vui lòng tải ảnh lên trước!", "error");

    setIsGenerating(true);
    setGeneratedCode("");
    setIsPreviewMode(false);
    setScanMsgIndex(0);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("model", selectedModel);
    formData.append("prompt", prompt);

    try {
      const res = await fetch(ENDPOINTS.AUTOCODE.GENERATE, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lỗi máy chủ");

      setGeneratedCode(data.code);
      showToast("Hoàn tất! Code đã sẵn sàng.", "success");
      
      // Delay 100ms để đợi DOM cập nhật <pre><code> rồi mới Highlight
      setTimeout(() => {
        analyzeCodeAndSetTab(data.code);
      }, 100);

    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // =================================================================
  // 5. COPY, TẢI VỀ VÀ PREVIEW
  // =================================================================
  const handleCopy = () => {
    if (!generatedCode) return showToast("Chưa có code để copy!", "error");
    navigator.clipboard.writeText(generatedCode).then(() => showToast("Đã chép vào Clipboard!"));
  };

  const handleDownload = () => {
    if (!generatedCode) return showToast("Chưa có code để tải về!", "error");
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `d4m_${fileTab.name}.${fileTab.ext}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const togglePreview = () => {
    if (!generatedCode) return showToast("Chưa có code!", "error");
    if (!fileTab.isRenderable) {
      return showToast("Trình duyệt chỉ hỗ trợ xem trước Web (HTML)!", "error");
    }
    setIsPreviewMode(!isPreviewMode);
  };

  return (
    <div className="d4m-page flex flex-col relative min-h-screen text-[#e2e8f0] font-sans selection:bg-indigo-500 selection:text-white">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <ConfigWarning
        serviceKey="gemini"
        message="Thêm GEMINI_API_KEY vào backend/.env để AutoCode có thể sinh code từ ảnh."
      />

      {/* VŨ TRỤ QUANG HỌC */}
      <style>{`
        .orb { position: fixed; border-radius: 50%; filter: blur(100px); z-index: -1; pointer-events: none; opacity: 0.4; animation: float 15s infinite alternate ease-in-out; }
        .orb-1 { width: 400px; height: 400px; background: rgba(99, 102, 241, 0.4); top: -100px; left: -100px; }
        .orb-2 { width: 300px; height: 300px; background: rgba(168, 85, 247, 0.3); bottom: -150px; right: -50px; animation-delay: -5s; }
        @keyframes float { 0% { transform: translate(0, 0); } 100% { transform: translate(50px, 50px); } }
        .ai-scanner { position: absolute; inset: 0; background: rgba(0,0,0,0.75); z-index: 30; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; border-radius: inherit; }
        .scanner-laser { position: absolute; width: 100%; height: 3px; background: #ff0050; box-shadow: 0 0 20px 5px rgba(255, 0, 80, 0.7); top: 0; animation: scan-laser 2s linear infinite alternate; }
        @keyframes scan-laser { 0% { top: 0%; } 100% { top: 100%; } }
        pre code.hljs { border-radius: 0 0 0.75rem 0.75rem; padding: 1.5rem; background: #0d1117 !important; }
      `}</style>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* HEADER */}
      <header className="bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-800 shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/hub" className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-105 transition">
              <i className="fa-solid fa-wand-magic-sparkles text-white text-xl"></i>
            </div>
            <h1 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 tracking-wide group-hover:opacity-80 transition flex items-center gap-2">
              AutoCode AI <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-600 px-1.5 py-0.5 rounded-md text-white">Promax</span>
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            {authStatus === "checking" && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20 shadow-inner">
                <i className="fa-solid fa-circle-notch fa-spin"></i> Kiểm tra thẻ...
              </div>
            )}
            {authStatus === "ok" && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20 shadow-inner">
                <i className="fa-solid fa-circle-check"></i> Xác thực Admin OK
              </div>
            )}
            {authStatus === "error" && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 shadow-inner">
                <i className="fa-solid fa-circle-xmark"></i> Từ chối
              </div>
            )}
            <Link to="/hub" className="px-4 py-1.5 text-xs font-bold text-white bg-white/5 hover:bg-white/20 rounded-lg border border-white/10 transition-all flex items-center gap-2">
              <i className="fa-solid fa-microchip"></i> Về Omni-Panel
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-6 relative z-10">
        
        {/* CỘT TRÁI (CONFIG) */}
        <div className="w-full lg:w-4/12 flex flex-col gap-6">
          
          {/* VÙNG CHỌN ẢNH */}
          <div className={`bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border ${isGenerating ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'border-gray-800'} transition-all`}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-regular fa-image text-indigo-400"></i> Nạp Hình Ảnh UI
            </h2>
            <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
            <label
              htmlFor="file-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="cursor-pointer border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-2xl bg-[#0b0f19]/50 flex flex-col items-center justify-center p-8 transition-all relative overflow-hidden group min-h-[280px]"
            >
              {previewUrl && (
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-[#0b0f19] z-10" />
              )}
              
              {/* LỚP PHỦ AI SCANNER KHI ĐANG GENERATE */}
              {isGenerating && (
                <div className="ai-scanner flex">
                  <div className="scanner-laser"></div>
                  <i className="fa-solid fa-robot text-5xl text-indigo-400 mb-5 animate-bounce drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]"></i>
                  <div className="font-mono text-[#4ade80] text-[13px] font-bold text-center drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] px-4">
                    {SCAN_MESSAGES[scanMsgIndex]}
                  </div>
                </div>
              )}

              {!previewUrl && (
                <div className="z-0 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-indigo-400"></i>
                  </div>
                  <p className="text-sm text-gray-300 font-bold">Click hoặc Kéo thả ảnh vào đây</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">Hỗ trợ PNG, JPG, WebP</p>
                </div>
              )}

              {previewUrl && !isGenerating && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-3 right-3 bg-red-500/80 text-white w-8 h-8 rounded-full z-20 flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur shadow-lg"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </label>
          </div>

          {/* VÙNG THAM SỐ CẤU HÌNH */}
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-800">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-gear text-indigo-400"></i> Tham số Cấu hình
            </h2>
            
            <div className="mb-5">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Động cơ AI (AI Model)</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="d4m-input w-full"
                >
                  {models.length === 0 && <option value="">Đang tải danh sách...</option>}
                  {models.map((m, idx) => (
                    <option key={idx} value={m.name}>{m.display}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-gray-500 pointer-events-none"></i>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Yêu cầu bổ sung (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows="4"
                className="d4m-input w-full"
                placeholder="VD: Code bằng ReactJS Tailwind, thêm hiệu ứng hover màu đỏ..."
              ></textarea>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || authStatus !== "ok"}
              className="d4m-btn d4m-btn-primary w-full"
            >
              {!isGenerating && (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              )}
              <i className={`fa-solid ${isGenerating ? "fa-circle-notch fa-spin" : "fa-wand-magic-sparkles"} text-lg`}></i>
              <span>{isGenerating ? "AI ĐANG VIẾT CODE..." : "Bắt Đầu Viết Code"}</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (EDITOR IDE) */}
        <div className="w-full lg:w-8/12 flex flex-col">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl flex flex-col h-[calc(100vh-140px)] min-h-[600px] shadow-2xl overflow-hidden border border-gray-700/50">
            
            {/* Toolbar VS Code Style */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#161b22]">
              <div className="flex items-center gap-4">
                <div className="flex gap-2 ml-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                {/* File Tab */}
                <div className="flex items-center bg-[#0d1117] text-gray-300 text-xs px-4 py-2 rounded-t-lg border border-b-0 border-gray-700/50 font-mono mt-2 mb-[-12px] relative z-10 transition-all">
                  <i className={`${fileTab.icon} mr-2 text-sm transition-all duration-500`}></i>
                  <span>{fileTab.name}.{fileTab.ext}</span>
                </div>
              </div>
              
              <div className="flex gap-2 relative z-20">
                <button onClick={handleCopy} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition">
                  <i className="fa-regular fa-copy"></i> Copy
                </button>
                <button onClick={handleDownload} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition">
                  <i className="fa-solid fa-download"></i> Save
                </button>
                {/* Nút Xem thử có bảo vệ Renderable */}
                <button
                  onClick={togglePreview}
                  disabled={!fileTab.isRenderable && !isPreviewMode}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    !fileTab.isRenderable && !isPreviewMode
                      ? "opacity-40 grayscale cursor-not-allowed bg-gray-500/10 border-gray-500/20 text-gray-400"
                      : isPreviewMode
                      ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20"
                      : "text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20"
                  }`}
                >
                  <i className={isPreviewMode ? "fa-solid fa-code" : "fa-regular fa-eye"}></i>
                  <span>{isPreviewMode ? "Xem Code" : "Xem thử"}</span>
                </button>
              </div>
            </div>

            {/* VÙNG HIỂN THỊ CODE HOẶC IFRAME */}
            <div className="flex-grow overflow-auto relative bg-[#0d1117] custom-scrollbar">
              {!generatedCode && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 z-10 bg-[#0d1117]">
                  <i className="fa-solid fa-code text-6xl mb-4 opacity-30"></i>
                  <p className="font-mono text-sm">Mã nguồn sẽ được kết xuất tại đây...</p>
                </div>
              )}
              
              {!isPreviewMode && generatedCode && (
                <pre className="m-0 h-full text-[13px] leading-relaxed custom-scrollbar">
                  <code ref={codeRef} className={`language-${detectedLang} block h-full`}>
                    {generatedCode}
                  </code>
                </pre>
              )}

              {isPreviewMode && generatedCode && (
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-full bg-white border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                ></iframe>
              )}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}