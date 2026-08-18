// src/pages/tools/GgDriveCommanderPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ENDPOINTS } from "../../config/api";
import { EXTERNAL } from "../../config/urls";
import ConfigWarning from "../../components/common/ConfigWarning";

export default function GgDriveCommanderPage() {
  // =================================================================
  // 1. QUẢN LÝ PHÂN QUYỀN & TRẠNG THÁI API GOOGLE DRIVE
  // =================================================================
  const [apiStatus, setApiStatus] = useState({
    authenticated: false,
    has_credentials: false,
    email: "admin@d4mdev.click",
    status_text: "",
    loading: true,
  });

  // =================================================================
  // 2. FORM CẤU HÌNH SAO CHÉP / TẢI VỀ
  // =================================================================
  const [mode, setMode] = useState("copy"); // 'copy' (Drive-to-Drive) | 'download' (Drive-to-Server)
  const [sourceUrl, setSourceUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [destinationPath, setDestinationPath] = useState("/sdcard/Download");
  const [fromPage, setFromPage] = useState(0);
  const [toPage, setToPage] = useState(0);
  const [maxGb, setMaxGb] = useState(700);
  const [ignoreKeywords, setIgnoreKeywords] = useState("_tmp, test, sample");

  // =================================================================
  // 3. QUẢN LÝ TIẾN TRÌNH & THỐNG KÊ (4 STAT CARDS)
  // =================================================================
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'history'
  const [taskId, setTaskId] = useState(null);
  const [taskState, setTaskState] = useState({
    status: "idle", // 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
    copied_bytes: 0,
    skipped_files: 0,
    speed_mbps: 0.0,
    copied_files: 0,
    current_file: "Chưa có tác vụ nào đang chạy. Vui lòng cấu hình bên trái...",
    logs: [
      "[System] D4M Drive Commander Pro VIP - Ready for Task Dispatch.",
      "[System] Môi trường cấu hình hoàn tất. Vui lòng bấm Bắt đầu Copy.",
    ],
    history: [],
  });

  const pollingIntervalRef = useRef(null);
  const logContainerRef = useRef(null);

  // Auto scroll terminal log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [taskState.logs]);

  // Kiểm tra kết nối API Drive khi tải trang
  useEffect(() => {
    checkDriveApiStatus();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const checkDriveApiStatus = async () => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    // Nếu chưa đăng nhập thì bỏ qua gọi API — tránh lỗi 401 ở console
    if (!token) {
      setApiStatus({
        authenticated: false,
        has_credentials: false,
        email: "admin@d4mdev.click",
        status_text: "Vui lòng đăng nhập để kiểm tra kết nối Drive",
        loading: false,
      });
      return;
    }
    try {
      const res = await fetch(ENDPOINTS.DLDRIVER.STATUS, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setApiStatus({
          authenticated: data.authenticated,
          has_credentials: data.has_credentials,
          email: data.email || "admin@d4mdev.click",
          status_text: data.status_text || "",
          loading: false,
        });
      } else {
        setApiStatus({ authenticated: false, has_credentials: false, email: "", status_text: "", loading: false });
      }
    } catch {
      setApiStatus({ authenticated: false, has_credentials: false, email: "", status_text: "", loading: false });
    }
  };

  // =================================================================
  // 4. KÍCH HOẠT TIẾN TRÌNH SAO CHÉP / TẢI VỀ
  // =================================================================
  const handleStartCopy = async () => {
    if (!sourceUrl.trim()) {
      alert("⚠️ Sếp vui lòng nhập URL Thư mục nguồn (Google Drive)!");
      return;
    }

    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    setTaskState((prev) => ({
      ...prev,
      status: "running",
      copied_bytes: 0,
      skipped_files: 0,
      speed_mbps: 0.0,
      copied_files: 0,
      current_file: "Đang kết nối tới Google Drive API...",
      logs: [
        `[${new Date().toLocaleTimeString("en-US")}] [Google Drive] Khởi động luồng ${
          mode === "copy" ? "Sao chép Drive-to-Drive" : "Tải Drive-to-Server"
        }...`,
      ],
    }));

    try {
      const endpoint =
        mode === "copy" ? ENDPOINTS.DLDRIVER.COPY : ENDPOINTS.DLDRIVER.DOWNLOAD;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          target_url: targetUrl.trim() || "root",
          destination: destinationPath.trim(),
          from_page: Number(fromPage),
          to_page: Number(toPage),
          max_gb: Number(maxGb),
          ignore_keywords: ignoreKeywords,
          mode: mode,
        }),
      });

      const data = await res.json();

      if (res.ok && data.task_id) {
        setTaskId(data.task_id);
        startPollingProgress(data.task_id);
      } else {
        setTaskState((prev) => ({
          ...prev,
          status: "failed",
          current_file: `❌ Lỗi khởi tạo: ${data.detail || "Không xác định"}`,
          logs: [
            ...prev.logs,
            `[Error] ${data.detail || "Không thể gửi yêu cầu lên máy chủ"}`,
          ],
        }));
      }
    } catch (err) {
      setTaskState((prev) => ({
        ...prev,
        status: "failed",
        current_file: `❌ Lỗi mạng: ${err.message}`,
        logs: [...prev.logs, `[Network Error] Mất kết nối tới API`],
      }));
    }
  };

  // Quét tiến trình thời gian thực (Polling mỗi 1.5s)
  const startPollingProgress = (tid) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(ENDPOINTS.DLDRIVER.PROGRESS(tid), {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setTaskState((prev) => ({
            ...prev,
            status: data.status || prev.status,
            copied_bytes: data.copied_bytes ?? prev.copied_bytes,
            skipped_files: data.skipped_files ?? prev.skipped_files,
            speed_mbps: data.speed_mbps ?? prev.speed_mbps,
            copied_files: data.copied_files ?? prev.copied_files,
            current_file: data.current_file || prev.current_file,
            logs: data.logs && data.logs.length > 0 ? data.logs : prev.logs,
          }));

          if (
            data.status === "completed" ||
            data.status === "failed" ||
            data.status === "stopped"
          ) {
            clearInterval(pollingIntervalRef.current);
          }
        }
      } catch (err) {
        console.warn("⚠️ Lỗi đồng bộ tiến trình:", err);
      }
    }, 1500);
  };

  // Dừng tiến trình khẩn cấp
  const handleStopCopy = async () => {
    if (!taskId) {
      setTaskState((prev) => ({
        ...prev,
        status: "stopped",
        current_file: "Đã dừng tiến trình.",
      }));
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      return;
    }

    try {
      await fetch(ENDPOINTS.DLDRIVER.STOP(taskId), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      setTaskState((prev) => ({
        ...prev,
        status: "stopped",
        current_file: "Sếp đã bấm Dừng Lại khẩn cấp!",
      }));
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    } catch {
      alert("❌ Không thể kết nối máy chủ để dừng tác vụ");
    }
  };

  // Xóa nhật ký log
  const handleClearLogs = () => {
    setTaskState((prev) => ({
      ...prev,
      logs: ["[System] Nhật ký đã được làm sạch bởi sếp."],
    }));
  };

  // Đổi từ Byte sang GB/MB dễ nhìn
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0.00 GB";
    const gb = bytes / Math.pow(1024, 3);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / Math.pow(1024, 2);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="d4m-page min-h-screen text-slate-50 font-sans selection:bg-blue-500 selection:text-white pb-12 overflow-x-hidden">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <ConfigWarning
        serviceKey="google"
        message="Thiếu file credentials Google (backend/auth/*.json) để kết nối Google Drive."
      />
      {/* HIỆU ỨNG MATRIX NEON BACKGROUND */}
      <div className="cyber-grid" aria-hidden="true"></div>
      <div className="orb orb-1" aria-hidden="true"></div>
      <div className="orb orb-2" aria-hidden="true"></div>

      {/* ============================================================= */}
      {/* HEADER NAVBAR */}
      {/* ============================================================= */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-4">
            <Link
              to="/hub"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
              title="Về Trạm Hub"
            >
              <i className="fa-solid fa-house text-sm"></i>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-white/20">
                <i className="fa-brands fa-google-drive text-white text-xl"></i>
              </div>
              <div>
                <h1 className="font-heading font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                  <span>1TouchDrive <span className="text-blue-400">PRO</span></span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                    VIP CORE
                  </span>
                </h1>
                <p className="text-[11px] text-gray-400 font-mono hidden sm:block">
                  Sao chép Google Drive sang Google Drive &amp; Tải Server Lõi
                </p>
              </div>
            </div>
          </div>

          {/* BADGE TRẠNG THÁI KẾT NỐI API */}
          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono border flex items-center gap-2 ${
                apiStatus.authenticated
                  ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : apiStatus.has_credentials
                    ? "bg-amber-950/50 border-amber-500/40 text-amber-400"
                    : "bg-rose-950/50 border-rose-500/40 text-rose-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus.authenticated ? "bg-emerald-400 animate-ping" : apiStatus.has_credentials ? "bg-amber-400" : "bg-rose-400"
                }`}
              ></span>
              <span>
                {apiStatus.authenticated
                  ? "Đã kết nối API"
                  : apiStatus.has_credentials
                    ? "Cần sinh token.json"
                    : "Thiếu credentials.json"}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* CẢNH BÁO KHI CHƯA CẤU HÌNH GOOGLE DRIVE */}
      {/* Dự trữ min-height cố định để tránh layout shift khi card hiện sau khi tải API */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 mt-4 min-h-[92px]">
        {apiStatus.loading ? (
          <div className="d4m-card animate-pulse" style={{ background: "rgba(255,255,255,.04)", borderColor: "rgba(255,255,255,.1)" }}>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-3 w-3/4 rounded bg-white/10" />
              </div>
            </div>
          </div>
        ) : !apiStatus.authenticated ? (
          <div className="d4m-card" style={{ background: "rgba(240,180,41,.08)", borderColor: "rgba(240,180,41,.3)" }}>
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-circle-exclamation text-amber-400 text-xl mt-0.5" />
              <div className="flex-1">
                <strong className="text-amber-200">Google Drive chưa được cấu hình.</strong>
                <p className="text-sm mt-1" style={{ color: "var(--d4m-text-dim)", lineHeight: 1.6 }}>
                  {apiStatus.has_credentials
                    ? "Đã có credentials.json nhưng chưa có token.json. Chạy lệnh dưới để đăng nhập Google 1 lần và sinh token:"
                    : "Cần tạo OAuth Client ID (Desktop) tại Google Cloud Console, tải file đặt tên <code>credentials.json</code> trong <code>backend/auth/</code>."}
                </p>
                <pre className="mt-2 px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,.4)", fontSize: ".75rem", color: "#93c5fd", overflowX: "auto" }}>
cd backend && ./venv/bin/python scripts/setup_google_drive.py
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ============================================================= */}
      {/* NỘI DUNG CHÍNH (2 CỘT: TRÁI CẤU HÌNH - PHẢI THỐNG KÊ & LOGS) */}
      {/* ============================================================= */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================= */}
        {/* CỘT TRÁI (4 COLS): KẾT NỐI API & CẤU HÌNH SAO CHÉP */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* CARD 1: KẾT NỐI API GOOGLE DRIVE */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 relative overflow-hidden">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <i className="fa-solid fa-cloud text-blue-400"></i>
              <span>Kết nối API</span>
            </h2>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Tài khoản: <span className="text-blue-300 font-bold">{apiStatus.email || "Chưa cấp quyền"}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert("Sếp vui lòng kiểm tra tệp token.json trong thư mục auth/ trên máy chủ.");
                }}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition"
              >
                <i className="fa-solid fa-key mr-1.5 text-yellow-400"></i>
                <span>Cấu hình Token Auth</span>
              </button>
            </div>
          </div>

          {/* CARD 2: CẤU HÌNH SAO CHÉP / TẢI VỀ */}
          <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
            
            {/* SWITCH CHẾ ĐỘ: CLONE DRIVE VS TẢI VỀ SERVER */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setMode("copy")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mode === "copy"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <i className="fa-solid fa-clone"></i>
                <span>Clone Drive sang Drive</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("download")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  mode === "download"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <i className="fa-solid fa-download"></i>
                <span>Tải về Server Local</span>
              </button>
            </div>

            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Cấu hình {mode === "copy" ? "sao chép" : "tải về"}
              </h2>
              <p className="text-xs text-gray-400">
                {mode === "copy" ? "Nguồn, đích và giới hạn chạy." : "Kéo dữ liệu trực tiếp về ổ cứng Server."}
              </p>
            </div>

            {/* THƯ MỤC NGUỒN */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 font-mono">
                Thư mục nguồn (G-Drive URL)
              </label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={EXTERNAL.DRIVE_FOLDER_EXAMPLE}
                className="d4m-input w-full"
              />
            </div>

            {/* THƯ MỤC ĐÍCH / HOẶC ĐƯỜNG DẪN LOCAL SERVER */}
            {mode === "copy" ? (
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 font-mono">
                  Thư mục đích (G-Drive URL)
                </label>
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={`${EXTERNAL.DRIVE_FOLDER("10yX...")} (Để trống = My Drive)`}
                  className="d4m-input w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 font-mono">
                  Đường dẫn lưu trữ trên Ubuntu (/var/www/...)
                </label>
                <input
                  type="text"
                  value={destinationPath}
                  onChange={(e) => setDestinationPath(e.target.value)}
                  placeholder="/var/www/downloads"
                  className="d4m-input w-full"
                />
              </div>
            )}

            {/* HÀNG 2 CỘT: TỪ TRANG - ĐẾN TRANG */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ggdrive-from" className="block text-xs font-bold text-gray-400 mb-1 font-mono">
                  Từ trang
                </label>
                <input
                  id="ggdrive-from"
                  type="number"
                  value={fromPage}
                  onChange={(e) => setFromPage(e.target.value)}
                  className="d4m-input w-full"
                />
              </div>
              <div>
                <label htmlFor="ggdrive-to" className="block text-xs font-bold text-gray-400 mb-1 font-mono">
                  Đến trang
                </label>
                <input
                  id="ggdrive-to"
                  type="number"
                  value={toPage}
                  onChange={(e) => setToPage(e.target.value)}
                  className="d4m-input w-full"
                />
              </div>
            </div>

            {/* DUNG LƯỢNG TỐI ĐA (GB) */}
            <div>
              <label htmlFor="ggdrive-maxgb" className="block text-xs font-bold text-gray-400 mb-1 font-mono">
                Dung lượng tối đa (GB)
              </label>
              <input
                id="ggdrive-maxgb"
                type="number"
                value={maxGb}
                onChange={(e) => setMaxGb(e.target.value)}
                className="d4m-input w-full"
              />
            </div>

            {/* BỎ QUA TỪ KHÓA */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 font-mono">
                Bỏ qua từ khóa (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                value={ignoreKeywords}
                onChange={(e) => setIgnoreKeywords(e.target.value)}
                placeholder="_tmp, test, sample"
                className="d4m-input w-full"
              />
            </div>

            {/* NÚT BẮT ĐẦU COPY & NÚT DỪNG LẠI (ROW 2 BUTTONS) */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartCopy}
                disabled={taskState.status === "running"}
                className="d4m-btn d4m-btn-primary w-full"
              >
                <i className="fa-solid fa-play"></i>
                <span>{mode === "copy" ? "Bắt đầu Copy" : "Bắt đầu Tải"}</span>
              </button>

              <button
                type="button"
                onClick={handleStopCopy}
                disabled={taskState.status !== "running"}
                className="w-full py-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-stop"></i>
                <span>Dừng lại</span>
              </button>
            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI (8 COLS): TAB, 4 THẺ THỐNG KÊ & TERMINAL NHẬT KÝ */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TABS CHUYỂN ĐỔI: TIẾN TRÌNH & NHẬT KÝ / LỊCH SỬ SAO CHÉP */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-6 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                activeTab === "logs"
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-bolt text-blue-400"></i>
              <span>Tiến trình &amp; Nhật ký</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                activeTab === "history"
                  ? "bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left text-purple-400"></i>
              <span>Lịch sử sao chép</span>
            </button>
          </div>

          {activeTab === "logs" ? (
            <>
              {/* 4 STAT CARDS OVERVIEW (ĐÃ COPY - ĐÃ BỎ QUA - TỐC ĐỘ - SỐ FILE) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                <div className="glass-card p-4 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    ĐÃ COPY / TẢI
                  </span>
                  <div className="text-xl sm:text-2xl font-heading font-black text-emerald-400 font-mono">
                    {formatBytes(taskState.copied_bytes)}
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    ĐÃ BỎ QUA
                  </span>
                  <div className="text-xl sm:text-2xl font-heading font-black text-yellow-400 font-mono">
                    {taskState.skipped_files} <span className="text-xs font-normal">file</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    TỐC ĐỘ
                  </span>
                  <div className="text-xl sm:text-2xl font-heading font-black text-blue-400 font-mono">
                    {taskState.speed_mbps.toFixed(2)} <span className="text-xs font-normal">MB/s</span>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-white/10 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    SỐ FILE ĐÃ XỬ LÝ
                  </span>
                  <div className="text-xl sm:text-2xl font-heading font-black text-purple-400 font-mono">
                    {taskState.copied_files} <span className="text-xs font-normal">file</span>
                  </div>
                </div>

              </div>

              {/* CURRENT FILE INDICATOR & PROGRESS BAR */}
              <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-blue-300 font-bold truncate pr-4">
                    <i className="fa-solid fa-folder-open mr-1.5 text-yellow-400"></i>
                    {taskState.current_file}
                  </span>
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                      taskState.status === "running"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse"
                        : taskState.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {taskState.status.toUpperCase()}
                  </span>
                </div>

                {/* ANIMATED LINEAR BAR */}
                <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      taskState.status === "running"
                        ? "w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 animate-pulse"
                        : taskState.status === "completed"
                        ? "w-full bg-emerald-500"
                        : "w-0"
                    }`}
                  ></div>
                </div>
              </div>

              {/* TERMINAL CONSOLE: NHẬT KÝ HOẠT ĐỘNG + NÚT XÓA LOG */}
              <div className="glass-card rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                
                {/* LOG HEADER */}
                <div className="bg-black/60 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider ml-2">
                      Nhật ký hoạt động
                    </span>
                  </div>

                  <button
                    onClick={handleClearLogs}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    <span>Xóa log</span>
                  </button>
                </div>

                {/* LOG BODY (DARK TERMINAL CONSOLE) */}
                <div
                  ref={logContainerRef}
                  className="p-6 font-mono text-xs text-slate-300 h-[380px] overflow-y-auto custom-scrollbar bg-black/80 flex flex-col gap-1.5 leading-relaxed"
                >
                  {taskState.logs.map((line, idx) => {
                    let textColor = "text-gray-300";
                    if (line.includes("Đã copy xong") || line.includes("[✓]"))
                      textColor = "text-emerald-400 font-bold";
                    if (line.includes("Đang copy file") || line.includes("Khởi động"))
                      textColor = "text-blue-300";
                    if (line.includes("bỏ qua") || line.includes("giới hạn"))
                      textColor = "text-yellow-400";
                    if (line.includes("Lỗi") || line.includes("[Error]"))
                      textColor = "text-rose-400 font-bold";

                    return (
                      <div key={idx} className={`border-l-2 border-transparent hover:border-blue-500 pl-2 ${textColor}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>

              </div>
            </>
          ) : (
            /* TAB LỊCH SỬ SAO CHÉP */
            <div className="glass-card p-8 rounded-3xl border border-white/10 text-center text-gray-400 font-mono py-24">
              <i className="fa-solid fa-clock-rotate-left text-4xl text-purple-400 mb-3"></i>
              <h3 className="text-base font-bold text-white mb-1">
                Lịch sử phiên làm việc
              </h3>
              <p className="text-xs text-gray-500">
                Toàn bộ dữ liệu sao chép trong ngày sẽ được tổng hợp tại đây sau mỗi tiến trình hoàn tất.
              </p>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}