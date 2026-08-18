// src/pages/tools/VocalRemovePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ENDPOINTS, API_BASE_URL } from "../../config/api";

export default function VocalRemovePage() {
  // =================================================================
  // 1. QUẢN LÝ PHÂN QUYỀN (JWT STATE)
  // =================================================================
  const [authStatus, setAuthStatus] = useState({
    isAuthorized: false,
    isActive: false,
    lockTitle: "",
    lockDesc: "",
  });

  // =================================================================
  // 2. QUẢN LÝ BIẾN FORM & TRẠNG THÁI XỬ LÝ
  // =================================================================
  const [selectedFile, setSelectedFile] = useState(null);
  const [customName, setCustomName] = useState("");
  const [sepBeat, setSepBeat] = useState(true);
  const [extLyrics, setExtLyrics] = useState(true);

  const [processingState, setProcessingState] = useState({
    isProcessing: false,
    progress: 0,
    text: "BẮT ĐẦU XỬ LÝ",
  });
  const [resultOutputs, setResultOutputs] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Refs quản lý Timer
  const progressIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Hàm giải mã JWT an toàn
  const parseJwt = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // Kiểm tra quyền truy cập ngay khi mở trang
  useEffect(() => {
    let token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");

    if (!token) {
      setAuthStatus({
        isAuthorized: false,
        isActive: false,
        lockTitle: "Cần Đăng Nhập",
        lockDesc:
          "Sếp chưa mang thẻ định danh D4M ID.<br/>Vui lòng đăng nhập vào hệ sinh thái để tiếp tục.",
      });
      return;
    }

    token = token.replace(/^["']|["']$/g, "");
    const payload = parseJwt(token);

    if (!payload) {
      setAuthStatus({
        isAuthorized: false,
        isActive: false,
        lockTitle: "Lỗi Định Danh",
        lockDesc:
          "Thẻ D4M ID của sếp bị hỏng hoặc đã hết hạn.<br/>Vui lòng đăng xuất và đăng nhập lại.",
      });
      return;
    }

    if (Number(payload.active) !== 1) {
      setAuthStatus({
        isAuthorized: false,
        isActive: false,
        lockTitle: "Tài Khoản Bị Đóng Băng",
        lockDesc:
          "Tài khoản của sếp <b>chưa được kích hoạt</b>.<br/>Vui lòng liên hệ Admin để mở khóa đặc quyền trước khi sử dụng AI!",
      });
      return;
    }

    setAuthStatus({
      isAuthorized: true,
      isActive: true,
      lockTitle: "",
      lockDesc: "",
    });

    return () => {
      resetTimers();
    };
  }, []);

  const resetTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
  };

  // =================================================================
  // 3. XỬ LÝ CHỌN FILE
  // =================================================================
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const nameWithoutExt =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      setCustomName(nameWithoutExt);
      setErrorMsg("");
    }
  };

  // =================================================================
  // 4. QUY TRÌNH XỬ LÝ AI & QUÉT RADAR BACKEND
  // =================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("⚠️ Sếp vui lòng chọn file Audio hoặc Video trước khi xử lý!");
      return;
    }

    resetTimers();
    setResultOutputs(null);
    setErrorMsg("");
    setProcessingState({
      isProcessing: true,
      progress: 0,
      text: "ĐANG CHUẨN BỊ (0%)...",
    });

    // 1. Giả lập thanh tiến độ tăng dần tới 95%
    let simulatedProgress = 0;
    progressIntervalRef.current = setInterval(() => {
      if (simulatedProgress < 50) {
        simulatedProgress += 1;
      } else if (simulatedProgress < 85) {
        simulatedProgress += 0.3;
      } else if (simulatedProgress < 95) {
        simulatedProgress += 0.05;
      }
      setProcessingState((prev) => ({
        ...prev,
        progress: simulatedProgress,
        text: `ĐANG XỬ LÝ AI (${Math.floor(simulatedProgress)}%)...`,
      }));
    }, 500);

    // 2. Đóng gói FormData
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("custom_name", customName);
    formData.append("separate_beat", sepBeat);
    formData.append("extract_lyrics", extLyrics);

    try {
      let token =
        localStorage.getItem("d4m_sso_token") ||
        localStorage.getItem("d4m_token");
      token = token ? token.replace(/^["']|["']$/g, "") : "";

      const response = await fetch(ENDPOINTS.AUDIO.EXTRACT, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      // 3. Nếu máy chủ báo Accepted (202) -> Khởi động Radar quét trạng thái
      if (response.status === 202 && result.project_folder) {
        const { project_folder: projectFolder, expected_outputs: expectedOutputs } = result;

        pollingIntervalRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(ENDPOINTS.AUDIO.STATUS(projectFolder));
            const statusData = await statusRes.json();

            if (statusData.status === "completed") {
              resetTimers();
              setProcessingState({
                isProcessing: false,
                progress: 100,
                text: "HOÀN THÀNH (100%)!",
              });
              setResultOutputs(expectedOutputs);
            }
          } catch (err) {
            console.error("⚠️ Lỗi quét trạng thái máy chủ Audio Studio:", err);
          }
        }, 5000);
      } else {
        resetTimers();
        setProcessingState({ isProcessing: false, progress: 0, text: "BẮT ĐẦU XỬ LÝ" });
        setErrorMsg(`❌ Lỗi máy chủ: ${result.message || result.detail || "Không thể khởi chạy dự án"}`);
      }
    } catch (err) {
      resetTimers();
      setProcessingState({ isProcessing: false, progress: 0, text: "BẮT ĐẦU XỬ LÝ" });
      setErrorMsg(`❌ Mất kết nối đến Backend: ${err.message}`);
    }
  };

  // =================================================================
  // 5. RENDER MÀN HÌNH KHÓA (UNAUTHORIZED / FROZEN)
  // =================================================================
  if (!authStatus.isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-center items-center px-4 font-sans selection:bg-blue-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <i className="fa-solid fa-lock text-5xl text-red-400 animate-pulse"></i>
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-wide">
          {authStatus.lockTitle || "Truy Cập Bị Từ Chối"}
        </h2>
        <p
          className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed text-center"
          dangerouslySetInnerHTML={{
            __html: authStatus.lockDesc || "Bạn không có quyền sử dụng tính năng này!",
          }}
        />
        <Link
          to={`/auth?redirect=/tools/vocal-remove`}
          className="d4m-btn d4m-btn-primary"
        >
          <i className="fa-solid fa-fingerprint text-lg"></i>
          <span>Đăng nhập D4M ID</span>
        </Link>
      </div>
    );
  }

  // =================================================================
  // 6. RENDER GIAO DIỆN CHÍNH (STUDIO PRO)
  // =================================================================
  return (
    <div className="d4m-page min-h-screen py-10 px-4 font-sans text-white selection:bg-blue-500">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="max-w-3xl mx-auto relative z-10">
        
        {/* HEADER & NÚT QUAY LẠI TRẠM HUB */}
        <div className="text-center mb-10 relative">
          <Link
            to="/hub"
            className="absolute left-0 top-0 mt-1 w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 flex items-center justify-center transition text-gray-400 hover:text-white"
            title="Quay lại Hub"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
          <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 shadow-lg">
            <i
              className="fa-solid fa-compact-disc text-3xl text-blue-400 animate-spin"
              style={{ animationDuration: "3s" }}
            ></i>
          </div>
          <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
            AI Audio Studio
          </h1>
          <p className="text-gray-400 text-sm">
            Công cụ bóc tách Beat &amp; Lời bài hát bằng AI Demucs/Whisper
          </p>
        </div>

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-sm flex items-center gap-3 animate-pulse">
            <i className="fa-solid fa-triangle-exclamation text-lg text-red-400 shrink-0"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KHỐI FORM CẤU HÌNH & TẢI FILE */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* KHỐI CHỌN FILE AUDIO/VIDEO */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                <i className="fa-solid fa-cloud-arrow-up mr-2 text-blue-400"></i>
                Chọn File (Audio/Video)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*, video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  required
                />
                <div className="border-2 border-dashed border-gray-600 rounded-2xl p-8 text-center bg-black/20 transition-colors hover:border-blue-500 hover:bg-blue-500/5">
                  <i
                    className={`fa-solid ${
                      selectedFile
                        ? "fa-music text-blue-400"
                        : "fa-file-audio text-gray-500"
                    } text-4xl mb-3 transition-colors`}
                  ></i>
                  <p
                    className={`font-medium ${
                      selectedFile
                        ? "text-blue-400 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : "Kéo thả file vào đây hoặc bấm để chọn"}
                  </p>
                </div>
              </div>
            </div>

            {/* KHỐI ĐẶT TÊN DỰ ÁN */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                <i className="fa-solid fa-pen-to-square mr-2 text-purple-400"></i>
                Tên dự án xuất ra (Tùy chọn)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Để trống sẽ tự động lấy theo tên file gốc"
                className="d4m-input w-full"
              />
            </div>

            {/* CHỌN CHỨC NĂNG AI (DEMUCS / WHISPER) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                onClick={() => setSepBeat((prev) => !prev)}
                className="flex items-center p-4 border border-white/10 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition select-none"
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                      sepBeat
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-500"
                    }`}
                  >
                    {sepBeat && (
                      <i className="fa-solid fa-check text-white text-xs"></i>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <p className="font-bold text-white text-sm">Tách Beat &amp; Vocal</p>
                  <p className="text-xs text-gray-400">Sử dụng Meta Demucs AI</p>
                </div>
              </label>

              <label
                onClick={() => setExtLyrics((prev) => !prev)}
                className="flex items-center p-4 border border-white/10 rounded-xl bg-black/20 cursor-pointer hover:bg-white/5 transition select-none"
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                      extLyrics
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-500"
                    }`}
                  >
                    {extLyrics && (
                      <i className="fa-solid fa-check text-white text-xs"></i>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <p className="font-bold text-white text-sm">
                    Trích xuất Lời (Lyrics)
                  </p>
                  <p className="text-xs text-gray-400">Sử dụng OpenAI Whisper</p>
                </div>
              </label>
            </div>

            {/* NÚT SUBMIT / PROGRESS BAR */}
            <button
              type="submit"
              disabled={processingState.isProcessing}
              className="relative w-full overflow-hidden bg-gray-800 hover:bg-gray-700 text-white font-black py-4 rounded-xl text-base uppercase tracking-wider flex items-center justify-center transition-all disabled:cursor-wait shadow-lg"
            >
              {/* Lớp nền chạy phần trăm tiến độ */}
              <div
                style={{ width: `${processingState.progress}%` }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 ease-out z-0"
              ></div>

              <div className="relative z-10 flex items-center gap-2">
                <i
                  className={`fa-solid ${
                    processingState.isProcessing
                      ? "fa-circle-notch animate-spin"
                      : "fa-wand-magic-sparkles"
                  } text-lg`}
                ></i>
                <span>{processingState.text}</span>
              </div>
            </button>
          </form>
        </div>

        {/* ============================================================= */}
        {/* MÀN HÌNH HIỂN THỊ KẾT QUẢ XỬ LÝ (RESULT BOX) */}
        {/* ============================================================= */}
        {resultOutputs && (
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 mt-8 rounded-3xl border-t-4 border-t-green-500 shadow-2xl animate-fade-in">
            <h3 className="font-black text-2xl mb-6 text-white text-center flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-check text-green-400"></i>
              <span>ĐÃ XỬ LÝ THÀNH CÔNG</span>
            </h3>

            <div className="space-y-4">
              {/* 1. GIỌNG HÁT (VOCAL) */}
              {resultOutputs.vocal && (
                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center text-blue-300 font-bold min-w-[130px]">
                    <i className="fa-solid fa-microphone-lines text-2xl mr-3 text-blue-400"></i>
                    <span>Giọng Hát</span>
                  </div>
                  <audio
                    controls
                    className="w-full max-w-md h-10 rounded-lg outline-none"
                    src={
                      resultOutputs.vocal.startsWith("http")
                        ? resultOutputs.vocal
                        : API_BASE_URL + resultOutputs.vocal
                    }
                  ></audio>
                  <a
                    href={
                      resultOutputs.vocal.startsWith("http")
                        ? resultOutputs.vocal
                        : API_BASE_URL + resultOutputs.vocal
                    }
                    download
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold text-center transition flex-shrink-0 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>Tải MP3</span>
                  </a>
                </div>
              )}

              {/* 2. NHẠC BEAT */}
              {resultOutputs.beat && (
                <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center text-purple-300 font-bold min-w-[130px]">
                    <i className="fa-solid fa-drum text-2xl mr-3 text-purple-400"></i>
                    <span>Nhạc Beat</span>
                  </div>
                  <audio
                    controls
                    className="w-full max-w-md h-10 rounded-lg outline-none"
                    src={
                      resultOutputs.beat.startsWith("http")
                        ? resultOutputs.beat
                        : API_BASE_URL + resultOutputs.beat
                    }
                  ></audio>
                  <a
                    href={
                      resultOutputs.beat.startsWith("http")
                        ? resultOutputs.beat
                        : API_BASE_URL + resultOutputs.beat
                    }
                    download
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold text-center transition flex-shrink-0 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>Tải MP3</span>
                  </a>
                </div>
              )}

              {/* 3. LỜI BÀI HÁT (LYRICS) */}
              {resultOutputs.lyrics && (
                <div className="bg-green-900/20 border border-green-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center text-green-300 font-bold min-w-[130px]">
                    <i className="fa-solid fa-file-lines text-2xl mr-3 text-green-400"></i>
                    <span>Lời Bài Hát</span>
                  </div>
                  <div className="text-gray-400 text-sm flex-1 truncate">
                    File Text (.txt/.lrc) chứa lời bài hát được bóc tách bằng Whisper AI
                  </div>
                  <a
                    href={
                      resultOutputs.lyrics.startsWith("http")
                        ? resultOutputs.lyrics
                        : API_BASE_URL + resultOutputs.lyrics
                    }
                    download
                    className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 border border-green-500/30 text-white px-5 py-2.5 rounded-xl text-sm font-bold text-center transition flex-shrink-0 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>Tải File Lời</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}