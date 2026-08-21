import React from "react";
import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../../components/music/music.css";

// ==========================================
// IMPORT CONTEXTS (D4M Music Pro)
// ==========================================
import { AuthProvider } from "../../components/music/contexts/AuthContext";
import { PlayerProvider } from "../../components/music/contexts/PlayerContext";
import ErrorBoundary from "../../components/music/ErrorBoundary";

// ==========================================
// IMPORT LAYOUT
// ==========================================
import Layout from "../../components/music/Layout";

// ==========================================
// IMPORT PAGES (Từ thư mục con ./pages)
// ==========================================
import Home from "./pages/Home";
import SearchPage from "./pages/Search";
import PlaylistDetail from "./pages/PlaylistDetail";
import Library from "./pages/Library";
import LikedSongs from "./pages/LikedSongs";
import History from "./pages/History";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ArtistPage from "./pages/ArtistPage";

// Khởi tạo Query Client cho hệ thống call API
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function D4MusicPlayer() {
  return (
    <div className="d4m-music-app-container w-full h-screen overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#1ed760] selection:text-black">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
        <AuthProvider>
          <PlayerProvider>

            {/* HỆ THỐNG ROUTING CON */}
            <Routes>
              {/* Auth Routes */}
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />

              {/* App Routes (Được bọc bởi Layout có Sidebar và BottomPlayer) */}
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="playlist/:id" element={<PlaylistDetail />} />
                <Route path="artist/:name" element={<ArtistPage />} />
                <Route path="library" element={<Library />} />
                <Route path="liked" element={<LikedSongs />} />
                <Route path="history" element={<History />} />
                <Route path="admin" element={<Admin />} />
              </Route>
            </Routes>
          </PlayerProvider>
        </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </div>
  );
}
