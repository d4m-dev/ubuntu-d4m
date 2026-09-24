// src/components/common/ErrorBoundary.jsx
// 🛡️ Chặn "đen màn hình": bắt lỗi render của cây con, hiện UI thân thiện + nút tải lại.
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // ghi log để dev truy vết (không ném tiếp → không đen màn hình)
    try { console.error("[ErrorBoundary]", error, info?.componentStack); } catch (e) {}
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <div className="text-3xl mb-2">🛠️</div>
            <div className="text-sm font-bold text-rose-400 mb-1">Có lỗi hiển thị tại khu vực này</div>
            <div className="text-xs text-gray-500 mb-4 break-words">
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-200 transition mr-2"
            >
              Thử lại
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-white/10 text-gray-200 text-xs font-bold hover:bg-white/20 transition"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
