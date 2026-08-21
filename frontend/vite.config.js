import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import zlib from 'zlib'

// Plugin nén một lượt sinh CẢ gzip (.gz) lẫn brotli (.br).
// Viết tay để tránh xung đột mtimeCache nội bộ khi chạy 2 instance
// vite-plugin-compression (brotli bị skip, chỉ ra .gz).
function compressionPlugin() {
  const threshold = 1024 * 5; // chỉ nén file > 5KB
  let outDir = path.resolve(__dirname, 'dist');
  return {
    name: 'd4m-compression',
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      outDir = path.isAbsolute(resolvedConfig.build.outDir)
        ? resolvedConfig.build.outDir
        : path.resolve(process.cwd(), resolvedConfig.build.outDir);
    },
    async closeBundle() {
      if (!fs.existsSync(outDir)) return;
      const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : [p];
      });
      const files = walk(outDir).filter((p) => /\.(js|css|html|json|svg|ico|ttf|woff2)$/.test(p));
      for (const file of files) {
        const size = fs.statSync(file).size;
        if (size < threshold) continue;
        const content = fs.readFileSync(file);
        // gzip
        fs.writeFileSync(file + '.gz', zlib.gzipSync(content, { level: zlib.constants.Z_BEST_COMPRESSION }));
        // brotli
        fs.writeFileSync(file + '.br', zlib.brotliCompressSync(content, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
            [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
          },
        }));
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    compressionPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    // Chunk size warning tăng lên để nhận biết vendor quá lớn
    chunkSizeWarningLimit: 900,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) yêu cầu manualChunks là function
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // 1) React core — tải riêng để cache lâu dài (thay đổi rất hiếm)
          if (
            id.includes("react/") ||
            id.includes("react-dom/") ||
            id.includes("react-router") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }
          // 2) Lucide icons — nhóm riêng (tree-shake đã loại bớt, còn lại khá nặng)
          if (id.includes("lucide-react")) return "vendor-lucide";
          // 3) Radix UI — toàn bộ tiện ích a11y
          if (id.includes("@radix-ui")) return "vendor-radix";
          // 4) TanStack Query + Axios — tầng data layer dùng chung
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("axios")) return "vendor-query";
          // 5) highlight.js — chỉ cần ở trang Documentation
          if (id.includes("highlight.js")) return "vendor-highlight";
          // 6) Phần còn lại của node_modules
          return "vendor";
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Chuyển tiếp API tới backend FastAPI (D4M Ecosystem)
      "/api": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:16868",
        changeOrigin: true,
        ws: true, // ⚡ Hỗ trợ WebSocket realtime (DM, notification) trong dev
      },
      // 🖼️🐉💎 Assets Social Hub (khung viền + Linh thú/Linh bảo) — cùng backend
      "/avatar_frames": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:16868",
        changeOrigin: true,
      },
      "/linhbao": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:16868",
        changeOrigin: true,
      },
      "/spirit_items.json": {
        target: process.env.VITE_API_PROXY || "http://127.0.0.1:16868",
        changeOrigin: true,
      },
    },
  },
})
