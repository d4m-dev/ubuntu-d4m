import { Component } from "react";

/**
 * Error Boundary — chặn crash toàn bộ app khi có lỗi render trong cây music.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Đã xảy ra lỗi." };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary bắt lỗi:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: "0 0 8px" }}>Đã có lỗi xảy ra</h2>
          <p style={{ color: "#a7a7a7", maxWidth: 420 }}>{this.state.message}</p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 16,
              padding: "10px 22px",
              borderRadius: 30,
              border: "none",
              background: "#1ed760",
              color: "#000",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
