// src/pages/tools/YtDownloaderPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ENDPOINTS, API_BASE_URL } from "../../config/api";
import { EXTERNAL } from "../../config/urls";

export default function YtDownloaderPage() {
  const navigate = useNavigate();

  // =================================================================
  // 1. QUẢN LÝ PHÂN QUYỀN (JWT STATE)
  // =================================================================
  const [authStatus, setAuthStatus] = useState({
    isAuthorized: false,
    isAdmin: false,
    isActive: false,
    fullName: "Khách",
  });

  // =================================================================
  // 2. QUẢN LÝ GIAO DIỆN & DỮ LIỆU
  // =================================================================
  const [viewMode, setViewMode] = useState("discovery"); // 'discovery' | 'result'
  const [inputQuery, setInputQuery] = useState("");
  const [videoList, setVideoList] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [gridTitle, setGridTitle] = useState("🔥 Thịnh Hành Hôm Nay");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Dữ liệu phân tích video được chọn
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null); // 'mp4' | 'mp3'
  const [downloadState, setDownloadState] = useState({
    status: "idle", // 'idle' | 'progress' | 'ready' | 'error'
    progress: 0,
    text: "",
    downloadUrl: null,
  });

  const progressIntervalRef = useRef(null);

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

  // Kiểm tra quyền hạn khi tải trang
  useEffect(() => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");

    if (!token) {
      setAuthStatus({ isAuthorized: false });
      return;
    }

    const payload = parseJwt(token);
    if (!payload) {
      setAuthStatus({ isAuthorized: false });
      return;
    }

    const isAdminUser = Number(payload.role) === 1;
    const isActiveUser =
      Number(payload.active) === 1 || payload.active === true;
    const name = payload.full_name || payload.sub || "Thành viên";

    setAuthStatus({
      isAuthorized: true,
      isAdmin: isAdminUser,
      isActive: isActiveUser,
      fullName: name,
    });

    // Nếu đã đăng nhập -> Tải ngay danh sách thịnh hành
    loadTrending(token);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // =================================================================
  // 3. API WORKFLOWS (TRENDING, SEARCH, INFO, DOWNLOAD)
  // =================================================================
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // Tải danh sách thịnh hành
  const loadTrending = async (tokenParam = null) => {
    const token =
      tokenParam ||
      localStorage.getItem("d4m_sso_token") ||
      localStorage.getItem("d4m_token");
    if (!token) return;

    setLoadingGrid(true);
    try {
      const res = await fetch(ENDPOINTS.YTDL.TRENDING, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.status === "success" && data.results?.length > 0) {
        setVideoList(data.results);
        setCurrentPage(1);
      } else {
        setGridTitle("🎵 Hôm nay nghe gì?");
        setVideoList([]);
      }
    } catch {
      setGridTitle("⚠️ Không thể kết nối vệ tinh thịnh hành");
    } finally {
      setLoadingGrid(false);
    }
  };

  // Kiểm tra chuỗi nhập vào là URL hay Từ khóa
  const isUrl = (str) => {
    return /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/.test(
      str
    );
  };

  // Tách YouTube ID (11 ký tự)
  const extractId = (url) => {
    const vid = url.includes("youtu.be")
      ? url.split("/").pop().split("?")[0]
      : new URLSearchParams(url.split("?")[1]).get("v");
    return vid ? vid.substring(0, 11) : null;
  };

  // Xử lý tìm kiếm hoặc phân tích trực tiếp
  const handleInputSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!authStatus.isActive) {
      alert("⚠️ Tài khoản chưa được kích hoạt!\nSếp chỉ được phép xem danh sách thịnh hành.");
      return;
    }

    const query = inputQuery.trim();
    if (!query) return;

    if (isUrl(query)) {
      triggerAnalyze(query);
    } else {
      // Chế độ tìm kiếm từ khóa
      setViewMode("discovery");
      setLoadingGrid(true);
      setGridTitle(`🔍 Kết quả tìm kiếm cho: "${query}"`);
      setVideoList([]);

      try {
        const res = await fetch(ENDPOINTS.YTDL.SEARCH, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        if (res.ok && data.status === "success" && data.results?.length > 0) {
          setVideoList(data.results);
          setCurrentPage(1);
        } else {
          setVideoList([]);
        }
      } catch {
        setGridTitle("❌ Lỗi kết nối tới máy chủ tìm kiếm");
      } finally {
        setLoadingGrid(false);
      }
    }
  };

  // Kích hoạt phân tích thông số Video
  const triggerAnalyze = async (url) => {
    if (!authStatus.isActive) {
      alert("⚠️ Tài khoản chưa được kích hoạt!\nSếp không có đặc quyền tải tài nguyên về máy.");
      return;
    }

    const vid = extractId(url);
    if (!vid) {
      alert("❌ Hệ thống không nhận diện được ID YouTube từ đường dẫn!");
      return;
    }

    setViewMode("result");
    setSelectedFormat(null);
    setDownloadState({ status: "idle", progress: 0, text: "", downloadUrl: null });
    setSelectedVideo({
      id: vid,
      url: url,
      title: "Đang quét vệ tinh thông số...",
      thumbnail: EXTERNAL.YT_THUMB(vid),
      resolutions: [],
      audio_sizes: {},
    });

    try {
      const res = await fetch(ENDPOINTS.YTDL.INFO, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (res.ok) {
        setSelectedVideo({ ...data, id: vid, url: url });
      } else {
        setSelectedVideo((prev) => ({
          ...prev,
          title: `❌ Lỗi: ${data.detail || "Không thể lấy thông tin video"}`,
        }));
      }
    } catch {
      setSelectedVideo((prev) => ({
        ...prev,
        title: "❌ Lỗi kết nối tới máy chủ phân tích AI!",
      }));
    }
  };

  // Bắt đầu tiến trình tải xuống
  const startDownload = async (quality) => {
    setDownloadState({
      status: "progress",
      progress: 0,
      text: authStatus.isAdmin
        ? "ĐANG TẢI VÀ BÓC TÁCH AI 5 TÀI NGUYÊN (0%)"
        : "ĐANG TẢI XUỐNG (0%)",
      downloadUrl: null,
    });

    // Tạo thanh giả lập chạy tới 90%
    let currentProg = 0;
    progressIntervalRef.current = setInterval(() => {
      if (currentProg < 90) {
        currentProg += 2;
        setDownloadState((prev) => ({
          ...prev,
          progress: currentProg,
          text: authStatus.isAdmin
            ? `ĐANG TẢI VÀ BÓC TÁCH AI 5 TÀI NGUYÊN (${Math.floor(currentProg)}%)`
            : `ĐANG TẢI XUỐNG (${Math.floor(currentProg)}%)`,
        }));
      }
    }, 400);

    try {
      const res = await fetch(ENDPOINTS.YTDL.DOWNLOAD, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: selectedVideo.url,
          format: selectedFormat,
          quality: quality.toString(),
          title: selectedVideo.title,
        }),
      });
      const data = await res.json();

      clearInterval(progressIntervalRef.current);

      if (res.ok && data.download_url) {
        const finalDownloadUrl = data.download_url.startsWith("http")
          ? data.download_url
          : API_BASE_URL + data.download_url;

        setDownloadState({
          status: "ready",
          progress: 100,
          text: "ẤN ĐỂ LƯU TỆP XUỐNG MÁY!",
          downloadUrl: finalDownloadUrl,
        });
      } else {
        setDownloadState({
          status: "error",
          progress: 0,
          text: `❌ LỖI: ${data.detail || "Không xác định"}`,
          downloadUrl: null,
        });
      }
    } catch {
      clearInterval(progressIntervalRef.current);
      setDownloadState({
        status: "error",
        progress: 0,
        text: "❌ LỖI KẾT NỐI MÁY CHỦ",
        downloadUrl: null,
      });
    }
  };

  // Xử lý tải file trực tiếp xuống máy
  const triggerBrowserDownload = () => {
    if (!downloadState.downloadUrl) return;
    const link = document.createElement("a");
    link.href = downloadState.downloadUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =================================================================
  // 4. LOGIC PHÂN TRANG (PAGINATION)
  // =================================================================
  const totalPages = Math.ceil(videoList.length / itemsPerPage);
  const currentGridData = videoList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // =================================================================
  // 5. RENDER MÀN HÌNH CHƯA ĐĂNG NHẬP (UNAUTHORIZED)
  // =================================================================
  if (!authStatus.isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col justify-center items-center px-4 font-sans selection:bg-red-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <i className="fa-solid fa-lock text-5xl text-red-400 animate-pulse"></i>
        </div>
        <h2 className="text-3xl font-black text-white mb-4 tracking-wide">
          Yêu Cầu Đăng Nhập
        </h2>
        <p className="text-gray-400 mb-8 leading-relaxed text-center max-w-md">
          Sếp chưa mang thẻ định danh D4M ID.
          <br />
          Vui lòng đăng nhập vào hệ sinh thái để sử dụng công cụ tải xuống này.
        </p>
        <Link
          to={`/auth?redirect=/tools/yt-downloader`}
          className="d4m-btn d4m-btn-primary"
        >
          <i className="fa-solid fa-fingerprint text-lg"></i>
          <span>Đăng nhập D4M ID</span>
        </Link>
      </div>
    );
  }

  // =================================================================
  // 6. RENDER GIAO DIỆN CHÍNH (PRO VIP)
  // =================================================================
  return (
    <div className="d4m-page min-h-screen text-white flex flex-col items-center py-8 px-4 font-sans selection:bg-red-500">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="w-full max-w-5xl flex flex-col gap-8">
        
        {/* NÚT QUAY LẠI TRẠM HUB */}
        <div className="-mb-2">
          <Link
            to="/hub"
            className="text-xs text-gray-500 hover:text-white transition font-mono inline-flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10"
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Trở về Hub hệ thống</span>
          </Link>
        </div>

        {/* HEADER & TRẠNG THÁI TÀI KHOẢN */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight mb-2 flex justify-center items-center gap-3">
            <i className="fa-brands fa-youtube text-red-500"></i>
            <span>Music Hub Pro</span>
          </h1>
          <p
            className={`text-xs font-bold uppercase tracking-widest ${
              authStatus.isAdmin
                ? "text-green-400"
                : authStatus.isActive
                ? "text-blue-400"
                : "text-gray-500"
            }`}
          >
            {authStatus.isAdmin
              ? `⚡ CHÀO SẾP ${authStatus.fullName.toUpperCase()} (VIP: MỞ KHÓA TÀI NGUYÊN AI 5 LỚP)`
              : authStatus.isActive
              ? `👤 CHÀO SẾP ${authStatus.fullName.toUpperCase()} (THÀNH VIÊN: ĐƯỢC TÌM & TẢI NHẠC)`
              : `❄️ CHÀO SẾP ${authStatus.fullName.toUpperCase()} (ĐÓNG BĂNG: CHỈ XEM THỊNH HÀNH)`}
          </p>
        </div>

        {/* THANH TÌM KIẾM / DÁN LINK */}
        <form
          onSubmit={handleInputSubmit}
          className="flex items-center gap-2 bg-[#1A1A1A] p-2 rounded-full border border-white/10 shadow-2xl transition focus-within:border-white/30"
        >
          <i className="fa-solid fa-magnifying-glass text-gray-500 ml-4"></i>
          <input
            type="text"
            disabled={!authStatus.isActive}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="d4m-input w-full"
            placeholder={
              authStatus.isActive
                ? "Dán link YouTube HOẶC nhập tên bài hát cần tìm..."
                : "Tài khoản chưa kích hoạt. Chỉ được xem danh sách."
            }
          />
          <button
            type="submit"
            disabled={!authStatus.isActive}
            className="bg-white hover:bg-gray-200 text-black font-bold text-sm px-8 py-3 rounded-full transition whitespace-nowrap disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md"
          >
            {authStatus.isActive ? "Tìm & Tải" : "Bị Khóa"}
          </button>
        </form>

        {/* ========================================================= */}
        {/* CHẾ ĐỘ 1: KHÁM PHÁ / KẾT QUẢ TÌM KIẾM */}
        {/* ========================================================= */}
        {viewMode === "discovery" && (
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <i className="fa-solid fa-fire text-orange-500"></i>
              <span>{gridTitle}</span>
            </h2>

            {/* SPINNER LOADING */}
            {loadingGrid ? (
              <div className="text-center py-16 text-gray-500">
                <i className="fa-solid fa-circle-notch animate-spin text-4xl mb-3 text-red-500"></i>
                <p className="text-sm font-bold">Đang quét vệ tinh tìm kiếm...</p>
              </div>
            ) : currentGridData.length === 0 ? (
              <div className="text-center py-16 bg-[#121212] rounded-3xl border border-white/5 text-gray-500">
                <i className="fa-solid fa-film text-3xl mb-2"></i>
                <p className="text-sm">Không tìm thấy video nào. Sếp hãy nhập từ khóa tìm kiếm bên trên nhé!</p>
              </div>
            ) : (
              /* LƯỚI CARD VIDEO */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentGridData.map((item, idx) => {
                  const cleanId = item.id.split("&")[0];
                  const url = EXTERNAL.YT_WATCH(cleanId);

                  let btnColor = "bg-gray-600";
                  let btnIcon = "fa-lock";
                  let btnText = "Khóa tải";

                  if (authStatus.isActive) {
                    btnColor = authStatus.isAdmin
                      ? "bg-purple-600 hover:bg-purple-500"
                      : "bg-red-600 hover:bg-red-500";
                    btnIcon = authStatus.isAdmin
                      ? "fa-wand-magic-sparkles"
                      : "fa-cloud-arrow-down";
                    btnText = authStatus.isAdmin ? "Tải & Chạy AI" : "Tải Xuống";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => triggerAnalyze(url)}
                      className="video-card bg-[#1A1A1A] rounded-xl overflow-hidden border border-white/5 cursor-pointer relative group flex flex-col justify-between hover:border-white/20 transition-all shadow-md"
                    >
                      <div className="aspect-video relative overflow-hidden bg-black shrink-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          {item.duration}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-xs">
                          <button
                            className={`${btnColor} text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg transform scale-90 group-hover:scale-100 transition-transform flex items-center gap-1.5`}
                          >
                            <i className={`fa-solid ${btnIcon}`}></i>
                            <span>{btnText}</span>
                          </button>
                        </div>
                      </div>
                      <div className="p-3 flex-grow flex flex-col justify-between">
                        <h3
                          className="font-bold text-sm text-white line-clamp-2 leading-tight mb-2"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 truncate">
                          <i className="fa-solid fa-circle-user mr-1"></i>
                          {item.uploader}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* THANH ĐIỀU KHIỂN PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-gray-800 text-white font-bold rounded-lg transition border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <i className="fa-solid fa-angle-left mr-1"></i> Trước
                </button>
                <span className="text-sm font-bold text-gray-400 font-mono">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-5 py-2 bg-[#1A1A1A] hover:bg-gray-800 text-white font-bold rounded-lg transition border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sau <i className="fa-solid fa-angle-right ml-1"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* CHẾ ĐỘ 2: BẢNG ĐIỀU KHIỂN TẢI XUỐNG VÀ CHỌN CHẤT LƯỢNG */}
        {/* ========================================================= */}
        {viewMode === "result" && selectedVideo && (
          <div className="w-full animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-gears text-blue-400"></i>
                <span>Bảng Điều Khiển Tải Xuống</span>
              </h2>
              <button
                onClick={() => setViewMode("discovery")}
                className="text-sm text-gray-400 hover:text-white underline inline-flex items-center gap-1"
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Quay lại khám phá</span>
              </button>
            </div>

            <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 shadow-2xl">
              {/* VIDEO THUMBNAIL PREVIEW */}
              <div className="rounded-2xl overflow-hidden aspect-video bg-[#111] relative shadow-lg border border-white/5">
                <img
                  src={selectedVideo.thumbnail}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* KHỐI CHỌN ĐỊNH DẠNG / CHẤT LƯỢNG */}
              <div className="flex flex-col justify-center">
                <h2 className="text-xl font-bold text-white mb-6 leading-snug line-clamp-2">
                  {selectedVideo.title}
                </h2>

                {/* BƯỚC 1: CHỌN ĐỊNH DẠNG (MP4 hay MP3) */}
                {!selectedFormat && selectedVideo.resolutions && (
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div
                      onClick={() => setSelectedFormat("mp4")}
                      className="cursor-pointer bg-[#1A1A1A] hover:bg-[#2A2A2A] p-6 rounded-2xl text-center border border-white/5 hover:border-red-500/40 transition shadow-md group"
                    >
                      <i className="fa-solid fa-video text-3xl mb-3 text-red-400 group-hover:scale-110 transition-transform"></i>
                      <h3 className="font-bold text-sm">Video MP4</h3>
                    </div>
                    <div
                      onClick={() => setSelectedFormat("mp3")}
                      className="cursor-pointer bg-[#1A1A1A] hover:bg-[#2A2A2A] p-6 rounded-2xl text-center border border-white/5 hover:border-blue-500/40 transition shadow-md group"
                    >
                      <i className="fa-solid fa-headphones text-3xl mb-3 text-blue-400 group-hover:scale-110 transition-transform"></i>
                      <h3 className="font-bold text-sm">Audio MP3 &amp; Lời</h3>
                    </div>
                  </div>
                )}

                {/* BƯỚC 2: CHỌN CHẤT LƯỢNG */}
                {selectedFormat && downloadState.status === "idle" && (
                  <div className="flex flex-col animate-fade-in">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex justify-between items-center">
                      <span>Chọn chất lượng tải về</span>
                      <button
                        onClick={() => setSelectedFormat(null)}
                        className="text-blue-400 hover:underline text-xs lowercase font-normal"
                      >
                        (Đổi định dạng)
                      </button>
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
                      {selectedFormat === "mp4" ? (
                        selectedVideo.resolutions?.map((resObj, idx) => (
                          <div
                            key={idx}
                            onClick={() => startDownload(resObj.height)}
                            className="p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl cursor-pointer flex justify-between items-center border border-white/5 hover:border-white/20 transition"
                          >
                            <span className="font-bold text-sm">
                              <i className="fa-solid fa-display text-gray-500 mr-2"></i>
                              {resObj.height}p
                            </span>
                            <span className="text-gray-500 text-xs font-mono">
                              {resObj.size}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div
                            onClick={() => startDownload(320)}
                            className="p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl cursor-pointer flex justify-between items-center border border-white/5 hover:border-white/20 transition"
                          >
                            <span className="font-bold text-sm">
                              <i className="fa-solid fa-headphones text-blue-500 mr-2"></i>
                              320 kbps (Cao cấp)
                            </span>
                            <span className="text-gray-500 text-xs font-mono">
                              {selectedVideo.audio_sizes?.["320"] || "~10MB"}
                            </span>
                          </div>
                          <div
                            onClick={() => startDownload(128)}
                            className="p-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-xl cursor-pointer flex justify-between items-center border border-white/5 hover:border-white/20 transition"
                          >
                            <span className="font-bold text-sm">
                              <i className="fa-solid fa-music text-gray-500 mr-2"></i>
                              128 kbps (Tiêu chuẩn)
                            </span>
                            <span className="text-gray-500 text-xs font-mono">
                              {selectedVideo.audio_sizes?.["128"] || "~4MB"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* BƯỚC 3: THANH PROGRESS & NÚT TẢI VỀ MÁY */}
                {downloadState.status !== "idle" && (
                  <div className="mt-6">
                    <button
                      onClick={
                        downloadState.status === "ready"
                          ? triggerBrowserDownload
                          : undefined
                      }
                      disabled={downloadState.status === "progress"}
                      className="relative overflow-hidden w-full h-16 bg-[#1A1A1A] border border-white/10 rounded-2xl transition shadow-xl group cursor-pointer disabled:cursor-wait"
                    >
                      {/* Lớp nền chạy phần trăm */}
                      <div
                        style={{ width: `${downloadState.progress}%` }}
                        className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
                          downloadState.status === "ready"
                            ? "bg-[#1DB954]"
                            : selectedFormat === "mp4"
                            ? "bg-gradient-to-r from-red-600 to-orange-500"
                            : "bg-gradient-to-r from-blue-600 to-cyan-500"
                        }`}
                      ></div>

                      {/* Dòng chữ trạng thái */}
                      <div className="relative z-10 font-bold text-sm text-white flex items-center justify-center gap-2 h-full">
                        {downloadState.status === "progress" && (
                          <>
                            <i className="fa-solid fa-circle-notch animate-spin"></i>
                            <span>{downloadState.text}</span>
                          </>
                        )}
                        {downloadState.status === "ready" && (
                          <>
                            <i className="fa-solid fa-cloud-arrow-down text-lg animate-bounce"></i>
                            <span>{downloadState.text}</span>
                          </>
                        )}
                        {downloadState.status === "error" && (
                          <>
                            <i className="fa-solid fa-triangle-exclamation text-red-400"></i>
                            <span className="text-red-300">{downloadState.text}</span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Nút Hủy / Đổi video khi đã xong hoặc lỗi */}
                    {downloadState.status !== "progress" && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => {
                            setSelectedFormat(null);
                            setDownloadState({
                              status: "idle",
                              progress: 0,
                              text: "",
                              downloadUrl: null,
                            });
                          }}
                          className="text-xs text-gray-400 hover:text-white underline"
                        >
                          Tải định dạng khác hoặc Video khác
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}