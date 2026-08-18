// src/App.jsx
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import SEO from "./components/common/SEO";

// ---- Lazy Load: mỗi route chỉ tải JS khi người dùng truy cập ----
// Giúp trang chủ nhẹ (không kéo theo toàn bộ bundle của các tool/player).
const HomePage = lazy(() => import("./pages/HomePage"));
const HubPage = lazy(() => import("./pages/HubPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const YtDownloaderPage = lazy(() => import("./pages/tools/YtDownloaderPage"));
const VocalRemovePage = lazy(() => import("./pages/tools/VocalRemovePage"));
const JarvisChatPage = lazy(() => import("./pages/tools/JarvisChatPage"));
const GgDriveCommanderPage = lazy(() => import("./pages/tools/GgDriveCommanderPage"));
const AutoCodePage = lazy(() => import("./pages/tools/AutoCodePage"));
const ProfilePage = lazy(() => import("./pages/admin/ProfilePage"));
const UploadSongPage = lazy(() => import("./pages/admin/UploadSongPage"));
const D4MusicPlayer = lazy(() => import("./pages/music/D4MusicPlayer"));
const VenusPage = lazy(() => import("./pages/social/VenusPage"));
const SocialHubPage = lazy(() => import("./pages/social/SocialHubPage"));
const NumerologyPage = lazy(() => import("./pages/social/NumerologyPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));

// Fallback trong lúc lazy-load chunk (tránh màn hình trắng / CLS)
function PageFallback() {
  return (
    <div
      role="status"
      aria-label="Đang tải trang"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#000",
        color: "#fff",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "#1ed760",
            animation: "d4m-spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <span style={{ fontSize: 13, opacity: 0.7 }}>Đang tải…</span>
        <style>{`@keyframes d4m-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <SEO />
      {/* 🍞 Toaster toàn cục — mọi trang đều dùng chung 1 hệ thống toast */}
      <Toaster
        theme="dark"
        position="bottom-right"
        richColors
        toastOptions={{
          style: {
            background: "#181818",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/music/*" element={<D4MusicPlayer />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/social/social-hub" element={<SocialHubPage />} />
          <Route path="/social/numerology" element={<NumerologyPage />} />
          <Route path="/social/venus" element={<VenusPage />} />
          <Route path="/tools/yt-downloader" element={<YtDownloaderPage />} />
          <Route path="/tools/vocal-remove" element={<VocalRemovePage />} />
          <Route path="/tools/jarvis-chat" element={<JarvisChatPage />} />
          <Route path="/tools/download-ggdriver" element={<GgDriveCommanderPage />} />
          <Route path="/tools/autocode" element={<AutoCodePage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/admin/upload-song" element={<UploadSongPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
